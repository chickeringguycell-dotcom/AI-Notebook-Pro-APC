import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission, getObjectAclPolicy } from "../lib/objectAcl";
import { getRequestUserId, getLegacyClaimOwnerId, requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const LEGACY_OWNER = "default-user";

const UPLOAD_TTL_MS = 15 * 60 * 1000;

interface PendingUpload {
  userId: string;
  expiresAt: number;
}

const pendingUploads = new Map<string, PendingUpload>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingUploads) {
    if (val.expiresAt <= now) {
      pendingUploads.delete(key);
    }
  }
}, 60_000).unref();

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_CONTENT_TYPE_PREFIXES = ["image/"];

/**
 * POST /storage/uploads/request-url — requires Clerk auth.
 */
router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    const { name, size, contentType } = parsed.data;

    if (!ALLOWED_CONTENT_TYPE_PREFIXES.some((p) => contentType.startsWith(p))) {
      res.status(400).json({ error: "Only image uploads are allowed" });
      return;
    }
    if (size > MAX_UPLOAD_BYTES) {
      res.status(400).json({ error: "File too large (max 12MB)" });
      return;
    }

    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      const userId = req.userId!;
      pendingUploads.set(objectPath, {
        userId,
        expiresAt: Date.now() + UPLOAD_TTL_MS,
      });

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

router.post(
  "/storage/uploads/finalize",
  requireAuth,
  async (req: Request, res: Response) => {
    const { objectPath } = req.body as { objectPath?: unknown };
    if (typeof objectPath !== "string" || !objectPath) {
      res.status(400).json({ error: "Missing objectPath" });
      return;
    }

    const userId = req.userId!;

    const pending = pendingUploads.get(objectPath);
    if (!pending) {
      res.status(400).json({ error: "No pending upload for this object path" });
      return;
    }
    if (pending.expiresAt <= Date.now()) {
      pendingUploads.delete(objectPath);
      res.status(400).json({ error: "Upload session has expired" });
      return;
    }
    if (pending.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    pendingUploads.delete(objectPath);

    let objectFile: Awaited<ReturnType<typeof objectStorageService.getObjectEntityFile>>;
    try {
      objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      req.log.error({ err: error }, "Error resolving object for finalization");
      res.status(500).json({ error: "Failed to finalize upload" });
      return;
    }

    try {
      const existingAcl = await getObjectAclPolicy(objectFile);
      if (existingAcl) {
        res.status(409).json({ error: "Object has already been finalized" });
        return;
      }
    } catch (error) {
      req.log.error({ err: error }, "Error checking existing ACL during finalization");
      res.status(500).json({ error: "Failed to finalize upload" });
      return;
    }

    let actualContentType: string;
    let actualSize: number;
    try {
      const [metadata] = await objectFile.getMetadata();
      actualContentType = (metadata.contentType as string) || "";
      actualSize = Number(metadata.size) || 0;
    } catch (error) {
      req.log.error({ err: error }, "Error reading object metadata for finalization");
      res.status(500).json({ error: "Failed to finalize upload" });
      return;
    }

    const isValidContentType = ALLOWED_CONTENT_TYPE_PREFIXES.some((p) =>
      actualContentType.startsWith(p),
    );
    const isValidSize = actualSize <= MAX_UPLOAD_BYTES;

    if (!isValidContentType || !isValidSize) {
      try {
        await objectFile.delete();
      } catch (deleteError) {
        req.log.error({ err: deleteError }, "Failed to delete invalid upload object");
      }
      res.status(400).json({
        error: isValidContentType
          ? "Uploaded file exceeds the 12 MB size limit"
          : "Only image uploads are allowed",
      });
      return;
    }

    try {
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: userId,
        visibility: "private",
      });
    } catch (error) {
      req.log.error({ err: error }, "Error setting ACL on finalized upload");
      res.status(500).json({ error: "Failed to finalize upload" });
      return;
    }

    res.json({ objectPath });
  },
);

/**
 * GET /storage/public-objects/* — unconditionally public.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/* — requires Clerk auth and per-user ACL match.
 *
 * Legacy fallback: objects originally uploaded under owner="default-user"
 * remain accessible to whichever user successfully ran POST /admin/claim-legacy.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const userId = req.userId!;
    let canAccess = await objectStorageService.canAccessObjectEntity({
      userId,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });

    if (!canAccess) {
      const acl = await getObjectAclPolicy(objectFile);
      if (acl?.owner === LEGACY_OWNER) {
        const claimOwnerId = await getLegacyClaimOwnerId();
        if (claimOwnerId && claimOwnerId === userId) {
          canAccess = true;
        }
      }
    }

    if (!canAccess) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

// Mark unused helper exported but referenced via type inference in callers
export { getRequestUserId };

export default router;

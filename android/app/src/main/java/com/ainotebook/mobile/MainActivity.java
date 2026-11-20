package com.ainotebook.mobile;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int REQ_MEDIA_PERMS = 4102;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView wv = this.bridge.getWebView();
            wv.getSettings().setMediaPlaybackRequiresUserGesture(false);
            wv.addJavascriptInterface(new AndroidNotebookBridge(), "AndroidNotebookBridge");
        }
    }

    public class AndroidNotebookBridge {
        @JavascriptInterface
        public void requestMediaPermissions(boolean camera, boolean mic) {
            List<String> needed = new ArrayList<>();
            if (camera && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.CAMERA);
            }
            if (mic && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.RECORD_AUDIO);
            }
            if (!needed.isEmpty()) {
                ActivityCompat.requestPermissions(MainActivity.this, needed.toArray(new String[0]), REQ_MEDIA_PERMS);
            }
        }

        @JavascriptInterface
        public void printNotebook(final String title) {
            runOnUiThread(() -> {
                try {
                    if (bridge == null || bridge.getWebView() == null) return;
                    WebView webView = bridge.getWebView();
                    PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                    if (printManager != null) {
                        String jobName = (title != null && !title.isEmpty()) ? title : "AI Notebook Pro";
                        PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
                        printManager.print(jobName, adapter, new PrintAttributes.Builder().build());
                    }
                } catch (Exception ignored) {
                }
            });
        }
    }
}

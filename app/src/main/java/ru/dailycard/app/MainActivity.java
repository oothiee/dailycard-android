package ru.dailycard.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Тонкая нативная оболочка вокруг текущего веб-приложения «Дейликард».
 *
 * Все файлы лежат в assets/www и отдаются через защищённый origin
 * https://dailycard.local. Это даёт WebView нормальный localStorage,
 * который сохраняется между запусками (в отличие от file://).
 */
public final class MainActivity extends Activity {

    private static final String APP_HOST = "dailycard.local";
    private static final String START_URL = "https://dailycard.local/index.html?app=1";

    private static final String LIGHT_BG = "#F3F7FF";
    private static final String DARK_BG = "#0A101B";
    private static final String BRAND = "#0B57D0";

    private WebView webView;
    private boolean backPending = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor(LIGHT_BG));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setGeolocationEnabled(false);
        settings.setDefaultTextEncodingName("utf-8");
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // У приложения своя тёмная тема на CSS. Не позволяем WebView
        // дополнительно «автоматически затемнять» интерфейс.
        if (Build.VERSION.SDK_INT >= 33) {
            settings.setAlgorithmicDarkeningAllowed(false);
        } else if (Build.VERSION.SDK_INT >= 29) {
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        webView.setWebViewClient(new AppWebViewClient());
        webView.addJavascriptInterface(new NativeBridge(), "DailycardAndroid");
        setContentView(webView);

        boolean restored = false;
        if (savedInstanceState != null) {
            restored = webView.restoreState(savedInstanceState) != null;
        }
        if (!restored) {
            webView.loadUrl(START_URL);
        }
    }

    private boolean isLocal(Uri uri) {
        return uri != null
                && "https".equalsIgnoreCase(uri.getScheme())
                && APP_HOST.equalsIgnoreCase(uri.getHost());
    }

    private WebResourceResponse serve(Uri uri) {
        if (!isLocal(uri)) {
            return null;
        }

        String path = uri.getPath();
        if (path == null || path.isEmpty() || "/".equals(path)) {
            path = "/index.html";
        }
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        if (path.contains("..") || path.indexOf('\\') >= 0) {
            return notFound();
        }

        try {
            InputStream input = getAssets().open("www/" + path);
            String mime = mimeType(path);
            String encoding = isTextMime(mime) ? "UTF-8" : null;
            return new WebResourceResponse(mime, encoding, 200, "OK", headers(), input);
        } catch (IOException error) {
            // Для путей без расширения отдаём index.html (на случай
            // будущих «красивых» URL), но не подменяем отсутствующие файлы.
            if (path.indexOf('.') < 0) {
                try {
                    return new WebResourceResponse(
                            "text/html", "UTF-8", 200, "OK", headers(),
                            getAssets().open("www/index.html"));
                } catch (IOException ignored) {
                    // Ниже вернём 404.
                }
            }
            return notFound();
        }
    }

    private WebResourceResponse notFound() {
        return new WebResourceResponse(
                "text/plain", "UTF-8", 404, "Not Found", headers(),
                new ByteArrayInputStream("Not found".getBytes(StandardCharsets.UTF_8)));
    }

    private Map<String, String> headers() {
        Map<String, String> result = new HashMap<>();
        result.put("Cache-Control", "no-store");
        result.put("X-Content-Type-Options", "nosniff");
        result.put("Referrer-Policy", "no-referrer");
        return result;
    }

    private boolean isTextMime(String mime) {
        return mime.startsWith("text/")
                || mime.contains("json")
                || mime.contains("javascript")
                || "image/svg+xml".equals(mime)
                || mime.contains("xml");
    }

    private String mimeType(String path) {
        String p = path.toLowerCase(Locale.US);
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".otf")) return "font/otf";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".xml")) return "application/xml";
        if (p.endsWith(".txt")) return "text/plain";
        if (p.endsWith(".map")) return "application/json";
        return "application/octet-stream";
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) {
            return true;
        }
        if (isLocal(uri)) {
            return false;
        }

        String scheme = uri.getScheme();
        if (scheme == null
                || "javascript".equalsIgnoreCase(scheme)
                || "data".equalsIgnoreCase(scheme)
                || "about".equalsIgnoreCase(scheme)
                || "file".equalsIgnoreCase(scheme)) {
            return true;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // Нет приложения, которое может открыть ссылку — просто игнорируем.
        }
        return true;
    }

    private void updateSystemBars(boolean dark) {
        Window window = getWindow();
        int statusColor = Color.parseColor(dark ? DARK_BG : LIGHT_BG);
        window.setStatusBarColor(statusColor);

        // На старых Android (23–25) светлые иконки на навигационной панели
        // недоступны, поэтому оставляем фирменный синий с белыми иконками.
        if (!dark && Build.VERSION.SDK_INT < 26) {
            window.setNavigationBarColor(Color.parseColor(BRAND));
        } else {
            window.setNavigationBarColor(Color.parseColor(dark ? DARK_BG : LIGHT_BG));
        }

        View decor = window.getDecorView();
        int flags = decor.getSystemUiVisibility();
        if (dark) {
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        } else {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        }
        decor.setSystemUiVisibility(flags);
    }

    private final class AppWebViewClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return serve(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return serve(Uri.parse(url));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleNavigation(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleNavigation(Uri.parse(url));
        }
    }

    public final class NativeBridge {
        @JavascriptInterface
        public void setTheme(final boolean dark) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    updateSystemBars(dark);
                }
            });
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        if (backPending) {
            return;
        }

        backPending = true;
        webView.evaluateJavascript(
                "(function(){try{return window.__dailycardBack?window.__dailycardBack():false}catch(e){return false}})()",
                value -> {
                    backPending = false;
                    if (!"true".equals(value)) {
                        finish();
                    }
                });
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.removeJavascriptInterface("DailycardAndroid");
            if (webView.getParent() instanceof ViewGroup) {
                ((ViewGroup) webView.getParent()).removeView(webView);
            }
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}

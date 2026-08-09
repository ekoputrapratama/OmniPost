import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:app_links/app_links.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const OmniPostCompanionApp());
}

class OmniPostCompanionApp extends StatelessWidget {
  const OmniPostCompanionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OmniPost Companion',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF050608),
        primaryColor: const Color(0xFF06B6D4),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF06B6D4),
          secondary: Color(0xFF0891B2),
          surface: Color(0xFF0D1117),
          background: Color(0xFF050608),
        ),
      ),
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;

  String _serverUrl = 'https://omnipost.example.com';
  bool _isEditingServer = false;
  final TextEditingController _serverController = TextEditingController();

  String _platform = '';
  String _token = '';
  String _statusText = 'Awaiting activation...';

  bool _showWebView = false;
  String _webviewUrl = '';
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _loadServerUrl();
    _initDeepLinking();
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _serverController.dispose();
    super.dispose();
  }

  // Load configured server URL
  Future<void> _loadServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('OMNIPOST_SERVER_URL');
    if (stored != null && stored.isNotEmpty) {
      setState(() {
        _serverUrl = stored;
        _serverController.text = stored;
      });
    } else {
      _serverController.text = _serverUrl;
    }
  }

  // Save server URL
  Future<void> _saveServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final url = _serverController.text.trim();
    if (url.isNotEmpty) {
      await prefs.setString('OMNIPOST_SERVER_URL', url);
      setState(() {
        _serverUrl = url;
        _isEditingServer = false;
        _statusText = 'Server endpoint updated!';
      });
      _showToast(
        'Configuration Saved',
        'Target endpoint updated successfully.',
      );
    }
  }

  // Set up Deep Linking
  void _initDeepLinking() {
    // 1. Handle deep link when the app is already open
    _linkSubscription = _appLinks.uriLinkStream.listen(
      (uri) {
        _handleDeepLink(uri);
      },
      onError: (err) {
        debugPrint('Deep Link Error: $err');
      },
    );

    // 2. Handle deep link when the app is cold-booted
    // _appLinks.getInitialLink().then((uri) {
    //   if (uri != null) {
    //     _handleDeepLink(uri);
    //   }
    // });
  }

  void _handleDeepLink(Uri uri) {
    debugPrint('Deep Link Received: $uri');
    try {
      final queryParams = uri.queryParameters;

      // If host is passed in deep link, we can dynamically configure server URL too!
      if (queryParams.containsKey('host')) {
        final host = queryParams['host'];
        if (host != null && host.isNotEmpty) {
          _serverController.text = host;
          _serverUrl = host;
          SharedPreferences.getInstance().then((prefs) {
            prefs.setString('OMNIPOST_SERVER_URL', host);
          });
        }
      }

      if (queryParams.containsKey('platform') &&
          queryParams.containsKey('token')) {
        final tgtPlatform = queryParams['platform'] ?? '';
        final tgtToken = queryParams['token'] ?? '';

        setState(() {
          _platform = tgtPlatform;
          _token = tgtToken;
          _statusText = 'Request received: Connect $tgtPlatform';
        });

        // Trigger login sequence
        _triggerLogin(tgtPlatform, tgtToken);
      }
    } catch (e) {
      debugPrint('Failed to parse deep link: $e');
    }
  }

  void _triggerLogin(String platformName, String secureToken) {
    String url = '';
    final p = platformName.toLowerCase();

    if (p == 'twitter' || p == 'x') {
      url = 'https://twitter.com/i/flow/login';
    } else if (p == 'instagram') {
      url = 'https://www.instagram.com/accounts/login/';
    } else if (p == 'facebook') {
      url = 'https://m.facebook.com/login';
    } else if (p == 'pinterest') {
      url = 'https://www.pinterest.com/login/';
    } else if (p == 'linkedin') {
      url = 'https://www.linkedin.com/login';
    } else {
      url = 'https://google.com';
    }

    setState(() {
      _webviewUrl = url;
      _showWebView = true;
    });
  }

  Future<void> _submitCookiesToServer(String cookieString) async {
    if (_isProcessing) return;
    setState(() {
      _isProcessing = true;
    });

    try {
      debugPrint(
        'Syncing cookies with server $_serverUrl for platform $_platform',
      );

      final response = await http.post(
        Uri.parse('$_serverUrl/api/accounts'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: jsonEncode({
          'platform': _platform,
          'method': 'session_cookie',
          'sessionCookie': cookieString,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _showAlert('Success', '$_platform account successfully connected!');
        setState(() {
          _showWebView = false;
          _platform = '';
          _token = '';
          _statusText = 'Successfully synchronized $_platform!';
        });
      } else {
        throw Exception(
          response.body.isNotEmpty
              ? response.body
              : 'Server responded with status ${response.statusCode}',
        );
      }
    } catch (e) {
      _showAlert('Sync Failed', e.toString());
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  void _showToast(String title, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF0D1117),
        // borderSide: const BorderSide(color: Color(0xFF06B6D4), width: 1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                color: Color(0xFF06B6D4),
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  void _showAlert(String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0D1117),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFF06B6D4), width: 1),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: Color(0xFF06B6D4),
            fontFamily: 'monospace',
          ),
        ),
        content: Text(message, style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK', style: TextStyle(color: Color(0xFF06B6D4))),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            // WebView Overlay
            if (_showWebView) _buildWebViewContainer(),

            // Main Screen Layout
            if (!_showWebView) _buildMainLayout(),
          ],
        ),
      ),
    );
  }

  Widget _buildWebViewContainer() {
    return Container(
      color: const Color(0xFF050608),
      child: Column(
        children: [
          // Header
          Container(
            height: 56,
            color: const Color(0xFF0D1117),
            padding: const EdgeInsets.symmetric(horizontal: 16),

            // border: const Border(
            //   bottom: BorderSide(color: Color(0xFF1E293B), width: 1),
            // ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'AUTHENTICATING ${_platform.toUpperCase()}',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Colors.white,
                      letterSpacing: 1,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                  onPressed: () {
                    setState(() {
                      _showWebView = false;
                      _isProcessing = false;
                    });
                  },
                ),
              ],
            ),
          ),

          // WebView
          Expanded(
            child: Stack(
              children: [
                InAppWebView(
                  initialUrlRequest: URLRequest(url: WebUri(_webviewUrl)),
                  initialSettings: InAppWebViewSettings(
                    userAgent:
                        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
                    sharedCookiesEnabled: true,
                    javaScriptEnabled: true,
                    domStorageEnabled: true,
                  ),
                  onWebViewCreated: (controller) {
                    // Register a callback to receive cookies securely
                    controller.addJavaScriptHandler(
                      handlerName: 'onCookiesExtracted',
                      callback: (args) {
                        if (args.isNotEmpty && args[0] is String) {
                          final cookieStr = args[0] as String;
                          if (cookieStr.length > 10) {
                            _submitCookiesToServer(cookieStr);
                          }
                        }
                      },
                    );
                  },
                  onLoadStop: (controller, url) async {
                    // Injects script to watch cookies
                    await controller.evaluateJavascript(
                      source: """
                      (function() {
                        const checkAndSend = () => {
                          if (document.cookie) {
                            window.flutter_inappwebview.callHandler('onCookiesExtracted', document.cookie);
                          }
                        };
                        checkAndSend();
                        setInterval(checkAndSend, 1500);
                      })();
                    """,
                    );
                  },
                  onUpdateVisitedHistory: (controller, url, isReload) async {
                    if (url == null) return;
                    final urlStr = url.toString();
                    final p = _platform.toLowerCase();

                    bool loggedIn = false;
                    if ((p == 'twitter' || p == 'x') &&
                        (urlStr.contains('twitter.com/home') ||
                            urlStr.contains('x.com/home'))) {
                      loggedIn = true;
                    } else if (p == 'instagram' &&
                        (urlStr == 'https://www.instagram.com/' ||
                            urlStr == 'https://www.instagram.com/home/')) {
                      loggedIn = true;
                    } else if (p == 'linkedin' &&
                        urlStr.contains('linkedin.com/feed')) {
                      loggedIn = true;
                    } else if (p == 'facebook' &&
                        (urlStr.contains('facebook.com/home') ||
                            urlStr.contains('m.facebook.com/home'))) {
                      loggedIn = true;
                    } else if (p == 'pinterest' &&
                        urlStr.contains('pinterest.com/')) {
                      loggedIn = true;
                    }

                    if (loggedIn) {
                      // Trigger fetch via cookie manager explicitly as secondary verification
                      final cookieManager = CookieManager.instance();
                      final cookies = await cookieManager.getCookies(url: url);
                      if (cookies.isNotEmpty) {
                        final cookieStr = cookies
                            .map((c) => '${c.name}=${c.value}')
                            .join('; ');
                        _submitCookiesToServer(cookieStr);
                      }
                    }
                  },
                ),

                if (_isProcessing)
                  Container(
                    color: Colors.black.withOpacity(0.85),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Color(0xFF06B6D4),
                            ),
                          ),
                          SizedBox(height: 20),
                          Text(
                            'Extracting session token...',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Uploading securely to OmniPost server',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainLayout() {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'OMNIPOST COMPANION',
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  fontSize: 15,
                  color: Color(0xFF06B6D4),
                ),
              ),
              IconButton(
                icon: Icon(
                  _isEditingServer ? Icons.close : Icons.settings,
                  color: const Color(0xFFCBD5E1),
                  size: 20,
                ),
                onPressed: () {
                  setState(() {
                    _isEditingServer = !_isEditingServer;
                  });
                },
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(color: Color(0xFF0F172A), thickness: 1),

          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                children: [
                  // Server edit config
                  if (_isEditingServer) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0D1117),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF06B6D4),
                          width: 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'SERVER ENDPOINT CONFIG',
                            style: TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF06B6D4),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _serverController,
                            style: const TextStyle(
                              color: Colors.white,
                              fontFamily: 'monospace',
                              fontSize: 13,
                            ),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: const Color(0xFF020617),
                              hintText: 'https://ais-dev-...run.app',
                              hintStyle: const TextStyle(
                                color: Color(0xFF334155),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 12,
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderSide: const BorderSide(
                                  color: Color(0xFF1E293B),
                                ),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderSide: const BorderSide(
                                  color: Color(0xFF06B6D4),
                                ),
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    _isEditingServer = false;
                                  });
                                },
                                child: const Text(
                                  'Cancel',
                                  style: TextStyle(color: Color(0xFF94A3B8)),
                                ),
                              ),
                              const SizedBox(width: 10),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF06B6D4),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 10,
                                  ),
                                ),
                                onPressed: _saveServerUrl,
                                child: const Text(
                                  'Save Address',
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 40),

                  // Status Icon Circle
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: const Color(0xFF06B6D4).withOpacity(0.08),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: const Color(0xFF06B6D4).withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: const Center(
                      child: Text('📱', style: TextStyle(fontSize: 32)),
                    ),
                  ),

                  const SizedBox(height: 24),
                  const Text(
                    'SYSTEM STATUS',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF64748B),
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _statusText,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Colors.white,
                      fontWeight: FontWeight.w300,
                    ),
                  ),

                  const SizedBox(height: 32),

                  if (_platform.isNotEmpty) ...[
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(
                          color: Color(0xFF06B6D4),
                          width: 1,
                        ),
                        backgroundColor: const Color(
                          0xFF06B6D4,
                        ).withOpacity(0.1),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 24,
                        ),
                      ),
                      onPressed: () => _triggerLogin(_platform, _token),
                      child: Text(
                        'OPEN LOGIN FOR ${_platform.toUpperCase()}',
                        style: const TextStyle(
                          color: Color(0xFF06B6D4),
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.02),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.05),
                          width: 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Center(
                            child: Text(
                              'HOW TO USE',
                              style: TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF06B6D4),
                              ),
                            ),
                          ),
                          SizedBox(height: 16),
                          Text(
                            '1. Tap "Connect Social Media Account" inside the OmniPost browser web application.\n\n'
                            '2. Select "Desktop/Mobile Companion" as your connection methodology.\n\n'
                            '3. Tap "Launch Companion App" to deep-link straight to this secure window.\n\n'
                            '4. The app will open the platform, wait for you to log in, and securely sync cookies automatically.',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 12,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          const Text(
            'OMNIPOST CORE v1.0.0 • POWERED BY FLUTTER',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 9,
              color: Color(0xFF475569),
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }
}

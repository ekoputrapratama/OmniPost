import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView, 
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [serverUrl, setServerUrl] = useState('https://omnipost.example.com');
  const [isEditingServer, setIsEditingServer] = useState(false);
  const [platform, setPlatform] = useState('');
  const [token, setToken] = useState('');
  const [statusText, setStatusText] = useState('Awaiting activation...');
  
  // WebView state
  const [showWebView, setShowWebView] = useState(false);
  const [webviewUrl, setWebviewUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load configured server URL
  useEffect(() => {
    async function loadConfig() {
      try {
        const stored = await AsyncStorage.getItem('OMNIPOST_SERVER_URL');
        if (stored) {
          setServerUrl(stored);
        }
      } catch (err) {
        console.error('Failed to load server config:', err);
      }
    }
    loadConfig();
  }, []);

  // Set up Deep Linking
  useEffect(() => {
    // 1. Handle deep link when the app is already open
    const subscription = Linking.addEventListener('url', handleDeepLinkEvent);

    // 2. Handle deep link when the app is cold-booted
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLinkEvent = (event) => {
    if (event.url) {
      handleDeepLink(event.url);
    }
  };

  const handleDeepLink = (url) => {
    console.log('Deep link received:', url);
    try {
      const parsed = Linking.parse(url);
      const { queryParams } = parsed;
      
      if (queryParams && queryParams.platform && queryParams.token) {
        const tgtPlatform = queryParams.platform;
        const tgtToken = queryParams.token;
        
        setPlatform(tgtPlatform);
        setToken(tgtToken);
        setStatusText(`Request received: Connect ${tgtPlatform}`);
        
        // Auto trigger the login
        triggerLogin(tgtPlatform, tgtToken);
      }
    } catch (err) {
      console.error('Failed to parse deep link:', err);
    }
  };

  const triggerLogin = (tgtPlatform, tgtToken) => {
    let url = '';
    const p = tgtPlatform.toLowerCase();
    
    if (p === 'twitter' || p === 'x') {
      url = 'https://twitter.com/i/flow/login';
    } else if (p === 'instagram') {
      url = 'https://www.instagram.com/accounts/login/';
    } else {
      url = 'https://google.com';
    }

    setWebviewUrl(url);
    setShowWebView(true);
  };

  const saveServerUrl = async () => {
    try {
      await AsyncStorage.setItem('OMNIPOST_SERVER_URL', serverUrl.trim());
      setIsEditingServer(false);
      setStatusText('Server endpoint updated!');
      Alert.alert('Configuration Saved', 'Target endpoint updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to persist configurations.');
    }
  };

  // Extract cookies and submit them back
  const handleNavigationStateChange = async (navState) => {
    if (isProcessing) return;

    const { url } = navState;
    const p = platform.toLowerCase();
    
    let loggedIn = false;
    if ((p === 'twitter' || p === 'x') && (url.includes('twitter.com/home') || url.includes('x.com/home'))) {
      loggedIn = true;
    } else if (p === 'instagram' && (url === 'https://www.instagram.com/' || url === 'https://www.instagram.com/home/')) {
      loggedIn = true;
    }

    if (loggedIn) {
      setIsProcessing(true);
      // Run custom injection to gather cookies from JavaScript context
      // This is a universal way to pull cookies in React Native WebViews
    }
  };

  // Receives document.cookie from JavaScript injection
  const handleMessageFromWebView = async (event) => {
    try {
      const cookieString = event.nativeEvent.data;
      if (!cookieString || cookieString.length < 5) {
        throw new Error('No valid cookies returned.');
      }

      console.log('Cookies successfully extracted. Sending to:', serverUrl);
      
      const response = await fetch(`${serverUrl}/api/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform: platform,
          method: 'session_cookie',
          sessionCookie: cookieString
        })
      });

      if (response.ok) {
        Alert.alert('Success', `${platform} account successfully connected!`);
        setShowWebView(false);
        setPlatform('');
        setToken('');
        setStatusText(`Successfully synchronized ${platform}!`);
      } else {
        const txt = await response.text();
        throw new Error(txt || 'Server returned an error status.');
      }
    } catch (err) {
      Alert.alert('Sync Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Javascript snippet to inject to obtain document.cookie
  const injectedJavaScript = `
    (function() {
      // Periodic check to capture cookies and post message back to React Native
      const checkAndSend = () => {
        if (document.cookie) {
          window.ReactNativeWebView.postMessage(document.cookie);
        }
      };
      // Send immediately and also register an interval
      checkAndSend();
      setInterval(checkAndSend, 1000);
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* WebView Overlay */}
      {showWebView && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.webHeader}>
            <Text style={styles.webTitle}>AUTHENTICATING {platform.toUpperCase()}</Text>
            <TouchableOpacity 
              style={styles.closeBtn}
              onPressed={() => {
                setShowWebView(false);
                setIsProcessing(false);
              }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <WebView
            source={{ uri: webviewUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            injectedJavaScript={injectedJavaScript}
            onMessage={handleMessageFromWebView}
            userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
            sharedCookiesEnabled={true}
          />

          {isProcessing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#06B6D4" />
              <Text style={styles.overlayText}>Extracting session token...</Text>
              <Text style={styles.overlaySubtext}>Uploading securely to OmniPost server</Text>
            </View>
          )}
        </View>
      )}

      {/* Main Screen Layout */}
      {!showWebView && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>OMNIPOST COMPANION</Text>
            <TouchableOpacity onPress={() => setIsEditingServer(!isEditingServer)}>
              <Text style={styles.settingsIcon}>{isEditingServer ? '✕' : '⚙️'}</Text>
            </TouchableOpacity>
          </View>

          {isEditingServer && (
            <View style={styles.configCard}>
              <Text style={styles.cardHeader}>SERVER ENDPOINT CONFIG</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.1.5:3000"
                placeholderTextColor="#334155"
                autoCapitalize="none"
              />
              <View style={styles.configBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditingServer(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveServerUrl}>
                  <Text style={styles.saveText}>Save Address</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.mainBody}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>📱</Text>
            </View>

            <Text style={styles.statusHeader}>SYSTEM STATUS</Text>
            <Text style={styles.statusValue}>{statusText}</Text>

            {platform ? (
              <TouchableOpacity 
                style={styles.launchBtn}
                onPress={() => triggerLogin(platform, token)}
              >
                <Text style={styles.launchText}>OPEN LOGIN FOR {platform.toUpperCase()}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.helpCard}>
                <Text style={styles.helpTitle}>HOW TO USE</Text>
                <Text style={styles.helpText}>
                  1. Tap "Connect Social Media Account" inside OmniPost browser web application.{"\n\n"}
                  2. Select "Desktop/Mobile Companion" as your connection methodology.{"\n\n"}
                  3. Tap "Launch Companion App" to deep-link straight to this secure window.{"\n\n"}
                  4. The app will open the platform, wait for you to log in, and securely sync cookies automatically.
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.footer}>OMNIPOST CORE v1.0.0 • POWERED BY EXPO</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  headerTitle: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 15,
    color: '#06B6D4',
  },
  settingsIcon: {
    fontSize: 18,
    color: '#cbd5e1',
  },
  configCard: {
    backgroundColor: '#0d1117',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#06B6D4',
    padding: 16,
    marginTop: 16,
  },
  cardHeader: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#06B6D4',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 6,
    color: '#f8fafc',
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: 12,
  },
  configBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  mainBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 32,
  },
  statusHeader: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 2,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 15,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '300',
    marginBottom: 32,
  },
  launchBtn: {
    backgroundColor: 'rgba(6,182,212,0.2)',
    borderColor: '#06B6D4',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  launchText: {
    color: '#06B6D4',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontSize: 12,
  },
  helpCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    width: '100%',
  },
  helpTitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#06B6D4',
    textAlign: 'center',
    marginBottom: 12,
  },
  helpText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 'auto',
    paddingTop: 20,
  },
  webHeader: {
    height: 50,
    backgroundColor: '#0d1117',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  webTitle: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#ffffff',
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 16,
  },
  overlaySubtext: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
  }
});

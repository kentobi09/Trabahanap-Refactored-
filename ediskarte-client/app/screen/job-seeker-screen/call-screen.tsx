import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Animated,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Camera, CameraPermissionStatus, useCameraDevice } from 'react-native-vision-camera';
import { Video, ResizeMode } from 'expo-av';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RTCView } from 'react-native-webrtc';
import { MediaStream as RTCMediaStream } from 'react-native-webrtc';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type CallType = 'video' | 'voice';

class WebRTCHandler {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: RTCMediaStream | null = null;
  private socket: Socket;
  private currentChatId: string = '';
  private currentUserId: string = '';
  private otherUserId: string = '';
  private socketConnected: boolean = false;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    // Handle socket connection
    this.socket.on('connect', () => {
      console.log('Socket connected with ID:', this.socket.id);
      this.socketConnected = true;
      
      // If we have a current chat ID, rejoin the room
      if (this.currentChatId) {
        this.socket.emit('join_room', this.currentChatId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.socketConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.socketConnected = false;
    });

    // Log all socket events for debugging
    this.socket.onAny((eventName, ...args) => {
      console.log(`Socket event received: ${eventName}`, args);
    });
  }

  async initializeCall(chatId: string, callerId: string, calleeId: string, isCaller: string) {
    try {
      console.log('Initializing call...', { isCaller, callerId, calleeId });
      
      // Store the IDs for reconnection handling
      this.currentChatId = chatId;
      this.currentUserId = callerId;
      this.otherUserId = calleeId;

      // Join the room
      this.socket.emit('join_room', chatId);
      
      // Get user media with explicit video constraints
      this.localStream = await mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      console.log('Local stream obtained:', this.localStream.getTracks().length, 'tracks');

      // Create peer connection with proper configuration
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
      });
      console.log('Peer connection created');

      // Add connection state change listener
      this.peerConnection.addEventListener('connectionstatechange', () => {
        console.log('Connection state changed:', this.peerConnection?.connectionState);
      });

      // Add ICE connection state change listener
      this.peerConnection.addEventListener('iceconnectionstatechange', () => {
        console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
      });

      // Add local stream tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind);
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!);
        }
      });

      // Handle incoming stream
      this.peerConnection.addEventListener('track', (event: any) => {
        console.log('Received remote track:', event.streams[0].getTracks().length, 'tracks');
        if (event.streams && event.streams[0]) {
          this.socket.emit('remote_stream_ready', { chatId });
        }
      });

      // Handle ICE candidates
      this.peerConnection.addEventListener('icecandidate', (event: any) => {
        console.log('ICE candidate:', event.candidate ? 'New candidate' : 'All candidates sent');
        if (event.candidate) {
          this.socket.emit('ice_candidate', {
            chatId,
            candidate: event.candidate,
            fromUserId: callerId,
            toUserId: calleeId
          });
        }
      });

      // Create and send offer if caller
      if (isCaller == "true") {
        try {
          console.log('Starting offer creation process...');
          
          const offer = await this.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            iceRestart: true
          });
          
          await this.peerConnection.setLocalDescription(offer);
          
          // Send offer
          this.socket.emit('create_offer', {
            chatId,
            callerId,
            calleeId,
            offer: {
              type: offer.type,
              sdp: offer.sdp
            }
          });

          // Listen for answer with new event name
          this.socket.on('receive_answer', async ({ signal, fromUserId,chatId }) => {
            console.log('Caller received answer:', { type: signal.type, fromUserId });
            if (signal.type === 'answer') {
              try {
                await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(signal));
                console.log('Remote description (answer) set successfully');
              } catch (error) {
                console.error('Error setting remote description:', error);
              }
            }
          });
        } catch (error) {
          console.error('Error in offer creation process:', error);
          throw error;
        }
      }

      return { localStream: this.localStream };
    } catch (error) {
      console.error('Error initializing call:', error);
      throw error;
    }
  }

  private initializePeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Set up peer connection event handlers
    if (this.peerConnection) {
      // Replace onicecandidate with addEventListener
      this.peerConnection.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          this.socket.emit('ice_candidate', {
            chatId: this.currentChatId,
            candidate: event.candidate,
            fromUserId: this.currentUserId,
            toUserId: this.otherUserId
          });
        }
      });
    
      // Replace onconnectionstatechange with addEventListener
      this.peerConnection.addEventListener('connectionstatechange', () => {
        console.log('Connection state:', this.peerConnection?.connectionState);
      });
    
      // Replace ontrack with addEventListener
      this.peerConnection.addEventListener('track', (event) => {
        console.log('Received remote track');
        if (event.streams && event.streams[0]) {
          this.socket.emit('remote_stream_ready', { chatId: this.currentChatId });
        }
      });
    }
  }
  async handleIncomingCall(chatId: string, callerId: string, calleeId: string) {
    try {
      console.log('Setting up incoming call handler...', { chatId, callerId, calleeId });
      
      // Store the IDs for reconnection handling
      this.currentChatId = chatId;
      this.currentUserId = calleeId;
      this.otherUserId = callerId;

      // Join the room
      this.socket.emit('join_room', chatId);
      console.log('Joined room:', chatId);


      // Listen for offer through the room
      this.socket.on('receive_offer', async ({ signal, fromUserId, chatId }) => {
        console.log('Received offer in room:', { 
          type: signal.type, 
          fromUserId,
          chatId,
          socketId: this.socket.id
        });

        try {
          if (signal.type === 'offer') {
            console.log('Processing offer...');
            
            await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(signal));
            console.log('Remote description set');
            
            const answer = await this.peerConnection?.createAnswer();
            console.log('Answer created:', answer);
            
            await this.peerConnection?.setLocalDescription(answer);
            console.log('Local description set:', this.peerConnection?.localDescription);
            
            // Send answer through the room
            this.socket.emit('create_answer', {
              chatId,
              callerId,
              calleeId,
              answer: this.peerConnection?.localDescription
            });
          }
        } catch (error) {
          console.error('Error processing offer:', error);
        }
      });

      // ICE candidate handling through the room
      this.socket.on('ice_candidate', async ({ candidate, fromUserId, chatId: candidateChatId }) => {
        if (candidateChatId !== chatId) return;
        
        try {
          if (this.peerConnection && candidate) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('Added ICE candidate from:', fromUserId);
          }
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      });

    } catch (error) {
      console.error('Error handling incoming call:', error);
      throw error;
    }
  }

  endCall() {
    // Leave the room
    if (this.currentChatId) {
      this.socket.emit('leave_room', this.currentChatId);
    }

    // Clear stored IDs
    this.currentChatId = '';
    this.currentUserId = '';
    this.otherUserId = '';

    // Update cleanup to include new event names
    this.socket.off('receive_offer');
    this.socket.off('receive_answer');
    this.socket.off('ice_candidate');
    this.socket.off('remote_stream_ready');
    this.socket.off('call_ended');

    // Stop and cleanup local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    }

    // Close and cleanup peer connection
    if (this.peerConnection) {
      // Remove all event listeners
      this.peerConnection.removeEventListener('connectionstatechange', () => {});
      this.peerConnection.removeEventListener('iceconnectionstatechange', () => {});
      this.peerConnection.removeEventListener('track', () => {});
      this.peerConnection.removeEventListener('icecandidate', () => {});
      
      // Close all data channels if they exist
      this.peerConnection.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      
      // Close the peer connection
      this.peerConnection.close();
    }

    // Reset all state
    this.localStream = null;
    this.peerConnection = null;
  }
}

const CallScreen = () => {
  const router = useRouter();
  const { callType, receiverName, receiverImage, chatId, isCaller, callerId, calleeId } = useLocalSearchParams();
  // console.log('Call parameters from client :', { isCaller});
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(callType === 'video');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [hasPermission, setHasPermission] = useState<CameraPermissionStatus>('not-determined');
  const [localStream, setLocalStream] = useState<RTCMediaStream | null>(null);
  
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const webrtcHandler = useRef<WebRTCHandler | null>(null);
  const socket = useRef<Socket | null>(null);

  // Animation value for pulsing effect
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    const initializeWebRTC = async () => {
      try {
        console.log('Initializing WebRTC...');
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.error('No authentication token found');
          setCallStatus('ended');
          return;
        }

        // Clean up any existing socket connection first
        if (socket.current) {
          socket.current.disconnect();
          socket.current = null;
        }

        // Initialize socket connection with authentication
        socket.current = io(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000`, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });
        
        // Wait for socket connection before proceeding
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Socket connection timeout'));
          }, 5000);

          socket.current?.on('connect', () => {
            clearTimeout(timeout);
            console.log('Socket connected with ID:', socket.current?.id);
            resolve(true);
          });
          
          socket.current?.on('connect_error', (error) => {
            clearTimeout(timeout);
            console.error('Socket connection error:', error);
            reject(error);
          });
        });

        // Initialize WebRTC handler only after socket is connected
        webrtcHandler.current = new WebRTCHandler(socket.current);
        
        // Initialize call
        const { localStream } = await webrtcHandler.current.initializeCall(
          chatId as string,
          callerId as string,
          calleeId as string,
          isCaller as string,
        );
        
        // Add this block for callee
        if (isCaller != "true") {
          await webrtcHandler.current.handleIncomingCall(
            chatId as string,
            callerId as string,
            calleeId as string
          );
        }
        
        console.log('Local stream received:', localStream?.getTracks().length);
        setLocalStream(localStream);
        
        setCallStatus('connected');
        setIsCallActive(true);
        startPulseAnimation();

        // Add call_ended event listener
        socket.current?.on('call_ended', ({ chatId, reason }) => {
          console.log('Call ended by other party:', reason);
          handleEndCall();
        });
      } catch (error) {
        console.error('Error initializing WebRTC:', error);
        setCallStatus('ended');
      }
    };

    initializeWebRTC();

    // Cleanup function
    return () => {
      console.log('Cleaning up WebRTC...');
      if (webrtcHandler.current) {
        webrtcHandler.current.endCall();
      }
      if (socket.current) {
        socket.current.off('call_ended');
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, []); // Empty dependency array to run only once on mount

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Start call timer only when connected
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    // Simulate call connection after 2 seconds
    const connectionTimer = setTimeout(() => {
      setCallStatus('connected');
      setIsCallActive(true);
      startPulseAnimation();
    }, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(connectionTimer);
    };
  }, [callStatus]);

  useEffect(() => {
    (async () => {
      const permission = await Camera.requestCameraPermission();
      setHasPermission(permission);
    })();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    // Emit end_call event to server
    if (socket.current) {
      socket.current.emit('end_call', {
        chatId,
        callerId,
        calleeId
      });
    }

    // Cleanup WebRTC
    if (webrtcHandler.current) {
      webrtcHandler.current.endCall();
    }

    // Cleanup socket
    if (socket.current) {
      // Remove all call-related event listeners
      socket.current.off('receive_offer');
      socket.current.off('receive_answer');
      socket.current.off('ice_candidate');
      socket.current.off('remote_stream_ready');
      socket.current.off('call_ended');
      socket.current.off('connect');
      socket.current.off('connect_error');
      socket.current.disconnect();
      socket.current = null;
    }

    // Reset state
    setCallStatus('ended');
    setCallDuration(0);
    setIsCallActive(false);
    setLocalStream(null);
    
    // Navigate back
    router.back();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const renderCallStatus = () => {
    switch (callStatus) {
      case 'connecting':
        return (
          <View style={styles.statusContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.statusText}>Connecting...</Text>
          </View>
        );
      case 'connected':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{formatTime(callDuration)}</Text>
          </View>
        );
      case 'ended':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Call ended</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Main Video View - Other Participant */}
      {callType === 'video' && callStatus === 'connected' ? (
        <View style={styles.mainVideoContainer}>
          <Video
            source={{ uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }}
            style={styles.mainVideo}
            resizeMode={ResizeMode.COVER}
            isMuted={false}
            shouldPlay={true}
            isLooping={true}
            useNativeControls={false}
          />
          <View style={styles.videoCallStatus}>
            {renderCallStatus()}
          </View>
        </View>
      ) : (
        // Fallback to blurred background image when not connected or not video call
        <View style={styles.background}>
          <Image
            source={{
              uri: receiverImage
                ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${(receiverImage + "").split("profiles/")[1] || ""}`
                : undefined,
            }}
            style={styles.backgroundImage}
            blurRadius={10}
          />
        </View>
      )}

      {/* Self View Video Preview - Small overlay */}
      {callType === 'video' && isCameraOn && localStream && (
        <View style={styles.selfViewContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.selfViewVideo}
            objectFit="cover"
          />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEndCall} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Receiver Info - Only show for voice calls or when not connected */}
        {(!callType || callType !== 'video' || callStatus !== 'connected') && (
          <View style={styles.receiverInfo}>
            <Image
              source={{
                uri: receiverImage
                  ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${(receiverImage + "").split("profiles/")[1] || ""}`
                  : undefined,
              }}
              style={styles.receiverImage}
            />
            <Text style={styles.receiverName}>{receiverName}</Text>
            {renderCallStatus()}
            <Text style={styles.callTypeText}>
              {isCameraOn ? 'Video Call' : 'Voice Call'}
            </Text>
          </View>
        )}

        {/* Call Controls - Keep at bottom */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-low'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          {callType === 'video' && (
            <TouchableOpacity
              style={[styles.controlButton, isCameraOn && styles.controlButtonActive]}
              onPress={toggleCamera}
            >
              <Ionicons
                name={isCameraOn ? 'videocam' : 'videocam-off'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  backButton: {
    padding: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  receiverInfo: {
    alignItems: 'center',
    marginTop: 60,
  },
  receiverImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#fff',
  },
  receiverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  statusContainer: {
    alignItems: 'center',
  },
  pulseCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    opacity: 1,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 10,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  endCallButton: {
    backgroundColor: '#ff3b30',
    transform: [{ rotate: '135deg' }],
  },
  callTypeText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  selfViewContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    width: 100,  // Slightly smaller
    height: 150, // Slightly smaller
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selfViewVideo: {
    width: '100%',
    height: '100%',
  },
  selfViewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  selfViewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  mainVideo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoCallStatus: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
});

export default CallScreen;




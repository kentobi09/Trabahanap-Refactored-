import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createAgoraRtcEngine, IRtcEngine, ChannelProfileType, ClientRoleType, RtcSurfaceView } from 'react-native-agora';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io, { Socket } from 'socket.io-client';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

declare module 'react-native-agora' {
  interface IRtcEngineEventHandler {
    onUserVideoStateChanged?: (connection: any, uid: number, state: number, reason: number) => void;
  }
}

const AgoraCallRoom = () => {
  const router = useRouter();
  const {
    callType,
    receiverName,
    receiverImage,
    chatId,
    isCaller,
    callerId,
    calleeId,
  } = useLocalSearchParams<{
    callType: string;
    receiverName: string;
    receiverImage: string;
    chatId: string;
    isCaller: string;
    callerId: string; 
    calleeId: string;  
  }>();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(callType === 'video');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [remoteUid, setRemoteUid] = useState<number | undefined>(undefined);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const [isCallRejected, setIsCallRejected] = useState(false);

  const rtcEngine = useRef<IRtcEngine | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localUid = parseInt(isCaller === "true" ? callerId : calleeId);

  // Add socket state
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize Agora
  useEffect(() => {
    const initializeAgora = async () => {
      try {
        // Request permissions
        const cameraPermission = await Camera.requestCameraPermission();
        const cameraStatus = cameraPermission === 'granted' ? 'granted' : 'denied';
        const { status: audioStatus } = await Audio.requestPermissionsAsync();
        
        if (cameraStatus !== 'granted' || audioStatus !== 'granted') {
          console.error('Permissions not granted');
          return;
        }

        setHasPermission(true);

        // Initialize Agora engine
        rtcEngine.current = createAgoraRtcEngine();
        
        await rtcEngine.current.initialize({
          appId: '972c46e324674254a89c265eeb8470d4',
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        // Set client role first
        await rtcEngine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);

        // Enable audio
        await rtcEngine.current.enableAudio();
        
        // Enable video if it's a video call
        if (callType === 'video') {
          await rtcEngine.current.enableVideo();
          await rtcEngine.current.setVideoEncoderConfiguration({
            dimensions: {
              width: 640,
              height: 360
            },
            frameRate: 15,
            bitrate: 0,
            orientationMode: 0,
            degradationPreference: 0
          });
          await rtcEngine.current.startPreview();
        }

        // Set up event handlers
        rtcEngine.current.addListener('onJoinChannelSuccess', (connection, elapsed) => {
          console.log('Successfully joined channel:', connection);
          setCallStatus('connected');
          if (callType === 'video') {
            setIsCameraOn(true);
          }
        });

        rtcEngine.current.addListener('onUserJoined', (connection, uid) => {
          console.log('Remote user joined:', uid);
          setRemoteUid(uid);
          setCallStatus('connected');
          if (callType === 'video') {
            setIsCameraOn(true);
          }
          // Start timer when remote user joins
          startCallTimer();
        });

        rtcEngine.current.addListener('onFirstLocalVideoFrame', (connection, width, height, elapsed) => {
          console.log('First local video frame:', width, height);
        });

        rtcEngine.current.addListener('onFirstRemoteVideoFrame', (connection, uid, width, height, elapsed) => {
          console.log('First remote video frame:', uid, width, height);
        });

        rtcEngine.current.addListener('onError', (err, msg) => {
          console.error('Agora error:', err, msg);
        });

        rtcEngine.current.addListener('onUserOffline', (connection, uid, reason) => {
          console.log('Remote user left:', uid, reason);
          handleEndCall();
        });

        rtcEngine.current.addListener('onLeaveChannel', (connection, stats) => {
          console.log('Channel left:', stats);
          handleEndCall();
        });

        rtcEngine.current.addListener('onUserVideoStateChanged', (connection, uid, state, reason) => {
          console.log('Remote user video state changed:', uid, state);
          if (uid === remoteUid) {
            setIsRemoteVideoEnabled(state === 1); // 1 means enabled, 0 means disabled
          }
        });

        const getUidFromId = (id: string) => {
            // Take first 8 characters of the ID and convert to number
            return parseInt(id.substring(0, 8), 16) || 0;
          };

        // Join channel
        const channelName = `call_${chatId}`;
        console.log('Joining channel:', channelName, 'as', isCaller === "true" ? 'caller' : 'callee', 'with UID:', parseInt(isCaller === "true" ? callerId : calleeId));

        await rtcEngine.current.joinChannel(
          '', // token
          channelName,
          getUidFromId(isCaller === "true" ? callerId : calleeId), // uid
          {
            publishMicrophoneTrack: true,
            publishCameraTrack: callType === 'video',
            autoSubscribeAudio: true,
            autoSubscribeVideo: callType === 'video',
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
            publishScreenTrack: false,
            publishMediaPlayerAudioTrack: false,
            publishMediaPlayerVideoTrack: false,
            publishTranscodedVideoTrack: false,
            publishCustomAudioTrack: false,
            publishCustomVideoTrack: false,
            publishEncodedVideoTrack: false,
        
          }
        );

      } catch (error) {
        console.error('Error initializing Agora:', error);
        setCallStatus('ended');
      }
    };

    initializeAgora();

    return () => {
      if (rtcEngine.current) {
        rtcEngine.current.leaveChannel();
        rtcEngine.current.release();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const checkCallRejection = async () => {
      try {
        const rejected = await AsyncStorage.getItem("call_rejected");
        
        if (rejected === "true") {
          console.log('Call was rejected, ending call...');
          setIsCallRejected(true);
          handleEndCall();
          // Clear the rejection status after handling it
          await AsyncStorage.removeItem("call_rejected");
        }
      } catch (error) {
        console.error('Error checking call rejection status:', error);
      }
    };

    // Check immediately when component mounts
    checkCallRejection();

    // Set up an interval to check periodically
    const rejectionCheckInterval = setInterval(checkCallRejection, 1000);

    // Clean up the interval when component unmounts
    return () => {
      clearInterval(rejectionCheckInterval);
    };
  }, []); // Empty dependency array since we want this to run only once on mount

  // Add socket initialization in useEffect
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const newSocket = io(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000`, {
          auth: { token },
          transports: ['websocket'],
        });

        setSocket(newSocket);
        return () => {
          newSocket.disconnect();
        };

       
        
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    initializeSocket();
  }, []);

  const startCallTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Reset duration to 0
    setCallDuration(0);
    // Start new timer
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const handleEndCall = async () => {
    try {
      if (rtcEngine.current) {
        // Stop preview if it's a video call
        if (callType === 'video') {
          await rtcEngine.current.stopPreview();
        }
        
        // Leave the channel
        await rtcEngine.current.leaveChannel();
        
        // Release the engine
        rtcEngine.current.release();
        rtcEngine.current = null;
      }
      
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Update state
      setCallStatus('ended');
      setRemoteUid(undefined);

      // Send end call message through socket
      if (socket && chatId ) {
        const message = {
          chatId,
          messageContent: `The ${callType === 'video' ? 'video' : 'voice'} call ended.
          Duration : ${formatTime(callDuration)}`,
          messageType: "call"
        };
        socket.emit("send_message", message);
      }
      
      // If call was rejected, show a message before navigating back
      if (isCallRejected) {
        console.log('Call was rejected by the other party');
      }
      
      // Navigate back
      router.back();
    } catch (error) {
      console.error('Error ending call:', error);
      router.back();
    }
  };

  const toggleMute = async () => {
    if (rtcEngine.current) {
      await rtcEngine.current.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = async () => {
    if (rtcEngine.current) {
      await rtcEngine.current.setEnableSpeakerphone(!isSpeakerOn);
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const toggleCamera = async () => {
    if (rtcEngine.current && callType === 'video') {
      if (isCameraOn) {
        // Turn off camera
        await rtcEngine.current.muteLocalVideoStream(true);
      } else {
        // Turn on camera
        await rtcEngine.current.muteLocalVideoStream(false);
      }
      setIsCameraOn(!isCameraOn);
    }
  };

  const switchCamera = async () => {
    if (rtcEngine.current && callType === 'video' && isCameraOn) {
      await rtcEngine.current.switchCamera();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera and microphone permissions are required</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background for voice calls or when video is off */}
      {(!callType || callType !== 'video' || !isCameraOn || !remoteUid) && (
        <View style={styles.background}>
          <Image
            source={{
              uri: receiverImage
                ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${
                    (receiverImage + "").split("profiles/")[1] || ""
                  }`
                : undefined,
            }}
            style={styles.backgroundImage}
            blurRadius={10}
          />
        </View>
      )}
      
      {/* Main Video View - Show remote user's video when available */}
      {callType === 'video' && (
        <View style={styles.mainVideoContainer}>
          {remoteUid && isRemoteVideoEnabled ? (
            // Show remote user's video in main view
            <RtcSurfaceView
              style={styles.mainVideo}
              canvas={{
                uid: remoteUid,
                renderMode: 1, // Fit mode
                mirrorMode: 0, // No mirror for remote video
              }}
            />
          ) : (
            // Show profile picture when remote video is off
            <View style={styles.background}>
              <Image
                source={{
                  uri: receiverImage
                    ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${
                        (receiverImage + "").split("profiles/")[1] || ""
                      }`
                    : undefined,
                }}
                style={styles.backgroundImage}
                blurRadius={10}
              />
              <View style={styles.receiverInfo}>
                <Text style={styles.receiverName}>{receiverName}</Text>
                <Text style={styles.statusText}>
                  {callStatus === 'connected' ? formatTime(callDuration) : 'Waiting for user...'}
                </Text>
              </View>
            </View>
          )}
          
          {/* Video call status overlay */}
          <View style={styles.videoCallStatus}>
            <Text style={styles.statusText}>{formatTime(callDuration)}</Text>
          </View>
        </View>
      )}

      {/* Self View Video Preview - Show local video in corner when remote is connected */}
      {callType === 'video' && isCameraOn && remoteUid && (
        <TouchableOpacity style={styles.selfViewContainer} onPress={switchCamera}>
          <RtcSurfaceView
            style={styles.selfViewVideo}
            canvas={{
              uid: 0, // Local view
              renderMode: 1,
              mirrorMode: 1, // Mirror local video
            }}
          />
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEndCall} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Receiver Info - Show for voice calls or when video is not active */}
        {(!callType || callType !== 'video' || !isCameraOn || !remoteUid) && (
          <View style={styles.receiverInfo}>
            <Image
              source={{
                uri: receiverImage
                  ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${
                      (receiverImage + "").split("profiles/")[1] || ""
                    }`
                  : undefined,
              }}
              style={styles.receiverImage}
            />
            <Text style={styles.receiverName}>{receiverName}</Text>
            <Text style={styles.statusText}>
              {isCallRejected ? 'Call Rejected' : 
               callStatus === 'connecting' ? 'Connecting...' : 
               callStatus === 'connected' ? (remoteUid ? formatTime(callDuration) : 'Waiting for user...') : 
               'Call ended'}
            </Text>
            <Text style={styles.callTypeText}>
              {callType === 'video' ? 'Video Call' : 'Voice Call'}
            </Text>
          </View>
        )}

        {/* Call Controls */}
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
            <Ionicons name="call" size={24} color="#fff" style={styles.endCallIcon} />
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
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    zIndex: 10,
  },
  receiverInfo: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  receiverImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#fff',
  },
  receiverName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: 'center',
  },
  callTypeText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  endCallIcon: {
    transform: [{ rotate: '-135deg' }],
  },
  mainVideoContainer: {
    flex: 1,
    position: 'relative',
  },
  mainVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  selfViewContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  selfViewVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  videoCallStatus: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
});

export default AgoraCallRoom;
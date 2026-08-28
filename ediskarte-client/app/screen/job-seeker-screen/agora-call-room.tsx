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
import { Camera } from 'react-native-vision-camera';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Socket } from 'socket.io-client';
import { getSocket } from '../../services/socket';

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

  const [currentCallType, setCurrentCallType] = useState<'voice' | 'video'>(callType as 'voice' | 'video' || 'voice');
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
  const socket = useRef<Socket | null>(null);

  // Initialize Agora
  useEffect(() => {
    const initializeAgora = async () => {
      try {
        const cameraPermission = await Camera.requestCameraPermission();
        const cameraStatus = cameraPermission === 'granted' ? 'granted' : 'denied';
        const { status: audioStatus } = await Audio.requestPermissionsAsync();
        
        if (cameraStatus !== 'granted' || audioStatus !== 'granted') {
          console.error('Permissions not granted');
          return;
        }

        setHasPermission(true);

        rtcEngine.current = createAgoraRtcEngine();
        
        await rtcEngine.current.initialize({
          appId: '972c46e324674254a89c265eeb8470d4',
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        await rtcEngine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        await rtcEngine.current.enableAudio();

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

        if (callType === 'video') {
          await rtcEngine.current.enableVideo();
          await rtcEngine.current.startPreview();
        }

        // Set up event handlers
        rtcEngine.current.addListener('onJoinChannelSuccess', (connection, elapsed) => {
          console.log('Successfully joined channel:', connection);
          setCallStatus('connected');
          if (currentCallType === 'video') {
            setIsCameraOn(true);
          }
        });

        rtcEngine.current.addListener('onUserJoined', (connection, uid) => {
          console.log('Remote user joined:', uid);
          setRemoteUid(uid);
          setCallStatus('connected');
          if (currentCallType === 'video') {
            setIsCameraOn(true);
          }
          startCallTimer();
        });

        rtcEngine.current.addListener('onUserOffline', (connection, uid, reason) => {
          console.log('Remote user left:', uid, reason);
          handleEndCall(false);
        });

        rtcEngine.current.addListener('onLeaveChannel', (connection, stats) => {
          console.log('Channel left:', stats);
          handleEndCall(false);
        });

        rtcEngine.current.addListener('onUserVideoStateChanged', (connection, uid, state, reason) => {
          console.log('Remote user video state changed:', uid, state);
          setRemoteUid(uid);
          setIsRemoteVideoEnabled(state === 1);
          if (state === 1) {
            setCurrentCallType('video');
          }
        });

        const getUidFromId = (id: string) => {
          return parseInt(id.substring(0, 8), 16) || 0;
        };

        const channelName = `call_${chatId}`;
        await rtcEngine.current.joinChannel(
          '',
          channelName,
          getUidFromId(isCaller === "true" ? callerId : calleeId),
          {
            publishMicrophoneTrack: true,
            publishCameraTrack: callType === 'video',
            autoSubscribeAudio: true,
            autoSubscribeVideo: true, // Always subscribe so we can transition from voice to video
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

  // Socket connection setup
  useEffect(() => {
    const activeSocket = getSocket();
    socket.current = activeSocket;

    activeSocket.on('call_ended', (data: any) => {
      console.log('Call ended via socket:', data);
      handleEndCall(false);
    });

    activeSocket.on('call_rejected', (data: any) => {
      console.log('Call rejected via socket:', data);
      setIsCallRejected(true);
      handleEndCall(false);
    });

    return () => {
      activeSocket.off('call_ended');
      activeSocket.off('call_rejected');
    };
  }, []);

  const startCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const handleEndCall = async (shouldEmitEnd = true) => {
    try {
      if (rtcEngine.current) {
        if (currentCallType === 'video') {
          await rtcEngine.current.stopPreview();
        }
        await rtcEngine.current.leaveChannel();
        rtcEngine.current.release();
        rtcEngine.current = null;
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setCallStatus('ended');
      setRemoteUid(undefined);

      if (shouldEmitEnd && socket.current && chatId) {
        // Notify server that call is terminated
        socket.current.emit('end_call', {
          chatId,
          callerId,
          calleeId,
        });

        // Add call log message to chat and attribute it to the caller
        const message = {
          chatId,
          messageContent: `The ${currentCallType === 'video' ? 'video' : 'voice'} call ended.
          Duration : ${formatTime(callDuration)}`,
          messageType: "call",
          senderId: callerId,
        };
        socket.current.emit("send_message", message);
      }
      
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
    if (rtcEngine.current) {
      if (currentCallType === 'voice') {
        // Upgrade voice call to video call dynamically
        await rtcEngine.current.enableVideo();
        await rtcEngine.current.startPreview();
        await rtcEngine.current.updateChannelMediaOptions({
          publishCameraTrack: true,
          autoSubscribeVideo: true,
        });
        setCurrentCallType('video');
        setIsCameraOn(true);
      } else {
        const nextState = !isCameraOn;
        await rtcEngine.current.muteLocalVideoStream(!nextState);
        setIsCameraOn(nextState);
      }
    }
  };

  const switchCamera = async () => {
    if (rtcEngine.current && currentCallType === 'video' && isCameraOn) {
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

  const cleanImageUrl = receiverImage
    ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${receiverImage.replace(/\\/g, "/")}`
    : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Blurred background for voice calls or when remote video is inactive */}
      {(currentCallType !== 'video' || !isCameraOn || !remoteUid || !isRemoteVideoEnabled) && (
        <View style={styles.background}>
          <Image
            source={{ uri: cleanImageUrl }}
            style={styles.backgroundImage}
            blurRadius={25}
          />
          <View style={styles.backgroundOverlay} />
        </View>
      )}
      
      {/* Main remote video view */}
      {currentCallType === 'video' && remoteUid && isRemoteVideoEnabled && (
        <View style={styles.mainVideoContainer}>
          <RtcSurfaceView
            style={styles.mainVideo}
            canvas={{
              uid: remoteUid,
              renderMode: 1,
              mirrorMode: 0,
            }}
          />
        </View>
      )}
      
      {/* Local preview view */}
      {currentCallType === 'video' && isCameraOn && (
        <TouchableOpacity 
          style={[
            styles.selfViewContainer,
            (!remoteUid || !isRemoteVideoEnabled) && styles.selfViewContainerFullScreen
          ]} 
          onPress={switchCamera}
        >
          <RtcSurfaceView
            style={styles.selfViewVideo}
            zOrderMediaOverlay={true}
            canvas={{
              uid: 0,
              renderMode: 1,
              mirrorMode: 1,
            }}
          />
        </TouchableOpacity>
      )}

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleEndCall(true)} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Unified call details content overlay */}
      <View style={styles.content}>
        {(currentCallType !== 'video' || !remoteUid || !isRemoteVideoEnabled) && (
          <View style={styles.receiverInfo}>
            <Image
              source={{ uri: cleanImageUrl }}
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
              {currentCallType === 'video' ? 'Video Call' : 'Voice Call'}
            </Text>
          </View>
        )}

        {/* Video active call duration */}
        {currentCallType === 'video' && remoteUid && isRemoteVideoEnabled && (
          <View style={styles.videoCallStatus}>
            <Text style={styles.statusText}>{formatTime(callDuration)}</Text>
          </View>
        )}

        {/* Unified controls list */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-low'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isCameraOn && styles.controlButtonActive]}
            onPress={toggleCamera}
          >
            <Ionicons
              name={isCameraOn ? 'videocam' : 'videocam-off'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          {currentCallType === 'video' && isCameraOn && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <Ionicons
                name="camera-reverse"
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={() => handleEndCall(true)}
          >
            <Ionicons name="call" size={20} color="#fff" style={styles.endCallIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 20,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    zIndex: 10,
  },
  receiverInfo: {
    alignItems: 'center',
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  receiverImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  receiverName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: 'center',
  },
  callTypeText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.75,
    marginTop: 10,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
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
    width: 110,
    height: 150,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  selfViewContainerFullScreen: {
    top: 0,
    right: 0,
    width: SCREEN_WIDTH,
    height: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
  selfViewVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  videoCallStatus: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
});

export default AgoraCallRoom;






















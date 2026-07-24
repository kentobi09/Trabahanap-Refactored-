import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  SafeAreaView,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  AppState,
  Button,
  ActivityIndicator,
  Linking
} from "react-native";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  useLocalSearchParams,
  useRouter,
  useGlobalSearchParams,
} from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import io, { Socket } from 'socket.io-client';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import ActionSheet from 'react-native-actionsheet';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { submitReport } from "../../../api/reportService.ts";
import { Audio } from 'expo-av';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Message = {
  id: string;
  chatId: string;
  messageContent: string | never;
  senderId: string;
  sentAt: string;
  deletedBySender: string;
  deletedByReceiver: string;
  messageType: string| 'sent' | 'received' | 'system' | 'file'| 'call';
  senderPic?: string | "https://randomuser.me/api/portraits/men/1.jpg";
  isDelivered?: boolean;
  isSeen?: boolean;
  readBy?: ReadStatus[];
  sender?: {
    id: string;
    name: string;
  };
};

interface ReadStatus {
  id: string;
  messageId: string;
  readAt: Date | String | null;
  participantId: string;
  participant?: {
    id: string;
    // Add other participant fields if needed
  };
}

type ChatProps = {
  recipientId?: string;
  recipientName?: string;
  recipientPic?: string;
  chatRequestStatus?: "pending" | "accepted" | "declined";
};
type MenuOption = {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
};


// Add this function near the top of the file, after the type definitions
const truncateName = (name: string, maxLength: number = 15) => {
  if (!name) return '';
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
};

const ChatScreen: React.FC<ChatProps> = ({
  recipientId = "1",
  recipientName = "Ken Robbie Galapate",
  recipientPic = "https://randomuser.me/api/portraits/men/1.jpg",
  chatRequestStatus = "pending",
}) => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [acceptOfferConfirmationVisible, setAcceptOfferConfirmationVisible] =
    useState(false);
  const router = useRouter();
  const {
    chatId,
    receiverName,
    chatStatus,
    jobId,
    offer,
    offerStatus,
    otherParticipantId,
    profileImage,
    callType,
    receiverImage,
  } = useLocalSearchParams();
  const [offerAmount, setOfferAmount] = useState(offer); // Define the money offer amount
  const [currentOfferStatus, setOfferStatus] = useState(offerStatus);
  const [messageInput, setMessageInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participantName, setParticipantName] = useState(receiverName || "");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [currentChatStatus, setCurrentChatStatus] = useState(chatStatus);
  const [jobRequestId, setJobRequestId] = useState(jobId);
  const [userType, setUserType] = useState("client");
  const actionSheetRef = useRef<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [visibleImageIndex, setVisibleImageIndex] = useState<number | null>(
    null
  );
  const [picIndex, setPicIndex] = useState<number>(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [isBlockedByJobSeeker, setIsBlockedByJobSeeker] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [callInfo, setCallInfo] = useState<{ calleeId: string; calleeInfo: any } | null>(null);
  const [incomingCallModalVisible, setIncomingCallModalVisible] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<{
    callerId: string;
    callerInfo: any;
  } | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ chatId: string; callerId: string; callerInfo: any; callType: string } | null>(null);
  const [ringtoneSound, setRingtoneSound] = useState<Audio.Sound | null>(null);


  const getStatusText = (item: any) => {
    if (
      item.readBy &&
      Array.isArray(item.readBy) &&
      item.readBy.length > 0 &&
      item.readBy.some((rs: { readAt: null }) => rs && rs.readAt !== null)
    ) {
      return "Seen";
    }
    return item.isDelivered ? "Delivered" : "";
  };
  const handleDeleteChat = (chatId: string) => {
    if (!socket) return;
    socket.emit("delete_chat", {
      chatId,
      userRole: "client",
    });
    router.back();
  };

  const canDeleteForEveryone = (msg: any) => {
    if (!msg || !msg.sentAt) return false;
    const isSender = msg.senderId === currentUserId;
    const within3Minutes =
      Date.now() - new Date(msg.sentAt).getTime() <= 3 * 60 * 1000;
    return isSender && within3Minutes;
  };

  const shouldHideMessage = (message: Message, currentUserId: any) => {
    const isSender = message.senderId === currentUserId;
    return isSender
      ? message.deletedBySender === "yes"
      : message.deletedByReceiver === "yes";
  };

  const handleLongPress = (message: any) => {
    setSelectedMessage(message);
    setActionSheetVisible(true);
    console.log("Long pressed message:", message); // Proper logging
  };

  const handleAttachPress = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true, // ⚠️ Add this to get base64 string
      });
      if (!socket) return;
      if (!result.canceled) {
        const image = result.assets[0];

        const base64Image = `data:${image.type || "image/jpeg"};base64,${
          image.base64
        }`;

        socket.emit("upload_image", {
          senderId: currentUserId,
          chatId: chatId,
          image: base64Image,
        });
      }
    } catch (error) {
      console.error("Error uploading image via socket:", error);
    }
  };

  // 2. Handle option selected (camera or gallery)
  const handleOptionPress = async (index: number) => {
    if (index === 0) {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        console.log("📷 Camera image:", result.assets[0].uri);
      }
    } else if (index === 1) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        console.log("🖼️ Gallery image:", result.assets[0].uri);
      }
    }
  };

  const fetchInitialMessages = async (token: string) => {
    try {
      const response = await axios.get(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/messages/${chatId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const messagesWithStatus = response.data.map((msg: Message) => ({
        ...msg,
        isDelivered: true, // Assume delivered if we're fetching from server
        isSeen: msg.readBy?.some((rs) => rs && rs.readAt !== null) || false,
      }));
      // Sort messages in descending order (most recent first)
      const sortedMessages = messagesWithStatus.sort(
        (a: Message, b: Message) =>
          new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );

      setMessages(sortedMessages);
      // console.log(response);
      if (currentOfferStatus == "pending") setOfferModalVisible(true);
      return sortedMessages;
    } catch (error) {
      console.error("Error fetching initial messages:", error);
      return [];
    }
  };

  const handleSendMessage = async () => {
    console.log("hello?????????????");
    if (messageInput.trim() === "" || !socket) return;

    try {
      const newMessage = {
        chatId,
        messageContent: messageInput,
        messageType: "text",
      };

      // Emit message through socket
      socket.emit("send_message", newMessage);

      // Clear input
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteMessage = async (deletionType: "forMe" | "forEveryone") => {
    if (!selectedMessage) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !socket) throw new Error("No authentication");

      socket.emit("delete-message", {
        messageId: selectedMessage.id,
        chatId: selectedMessage.chatId,
        deletionType,
        isSender: selectedMessage.senderId === currentUserId,
      });

      // Optimistic update
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === selectedMessage.id
            ? {
                ...msg,
                ...(deletionType === "forEveryone"
                  ? { deletedBySender: "yes", deletedByReceiver: "yes" }
                  : {
                      [selectedMessage.senderId === currentUserId
                        ? "deletedBySender"
                        : "deletedByReceiver"]: "yes",
                    }),
                messageContent: "This message was deleted",
              }
            : msg
        )
      );
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleApprove = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/chats/${chatId}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCurrentChatStatus("approved");
      handleSystemMessage("Client accepted the chat request", "system");
    } catch (error) {
      console.error("Error approving chat:", error);
    }
  };

  const handleReject = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/chats/${chatId}/reject`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      handleSystemMessage("Client declined the chat request", "system");
      setCurrentChatStatus("declined");
      setShowApprovalModal(false);
      router.back(); // Optionally navigate back after rejection
    } catch (error) {
      console.error("Error declining chat:", error);
    }
  };

  //-----------------------------------------------------------------------------------------------------------------
  //mga use effect dito pocha
  // Initialize with mock conversation

  useEffect(() => {
    // Initialize Socket.IO connection
    const initSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.warn("No token found, redirecting to sign-in...");
        router.push("/sign_in");
        return;
      }

      // First, fetch initial messages via REST API
      await fetchInitialMessages(token);

      const newSocket = io(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000`,
        {
          auth: {
            token: token,
          },
        }
      );
      if (currentUserId) {
        console.log('Re-registering user:', currentUserId);
        newSocket.emit("register_user", currentUserId);
      }

      newSocket.on("connect", () => {
        console.log('Socket connected with ID:', newSocket.id);
      });
      newSocket.on("client_offer_notification", (data) => {
        console.log("📩 Offer Receiveds :", data);
        setOfferAmount(data.offerAmount);
        setOfferStatus(data.status);
        setOfferModalVisible(true);
      });

      // Listen for new messages
      newSocket.on("receive_message", (message: Message) => {
        setMessages((prevMessages) => {
          // Prevent duplicate messages
          const isDuplicate = prevMessages.some((msg) => msg.id === message.id);
          return isDuplicate ? prevMessages : [message, ...prevMessages];
        });
      });

      setSocket(newSocket);

      // Cleanup socket on component unmount
      return () => {
        newSocket.disconnect();
      };
    };

    // Fetch Current User ID
    const getCurrentUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("currentUserId");
        if (!storedUser) {
          console.warn("⚠ No stored user found.");
          return;
        }
        setCurrentUserId(storedUser);
      } catch (error) {
        console.error("🚨 Error retrieving user:", error);
      }
    };

    getCurrentUser();
    initSocket();
  }, [chatId, currentUserId]);

  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages with status
    socket.on("receive_message", (message: Message) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((m) => m.id === message.id)) return prev;

        return [message, ...prev];
      });
    });

    socket.on("message_seen", ({ messageId, readStatus }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                readBy: [...(msg.readBy || []), readStatus],
                isSeen: true,
              }
            : msg
        )
      );
    });

    socket.on("message_delivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isDelivered: true } : msg
        )
      );
    });

    socket.on("chat_approved", (data) => {
      if (data.status === "approved") {
        setCurrentChatStatus("approved");
      }
    });

    socket.on("chat_declined", (data) => {
      if (data.status === "declined") {
        setCurrentChatStatus("declined");
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_seen");
      socket.off("chat_approved");
      socket.off("chat_declined");
      socket.off("message_delivered");
    };
  }, [socket]);

  useEffect(() => {
    const checkChatStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await axios.get(
          `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/chats/${chatId}/status`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setCurrentChatStatus(response.data.status);

        // Show modal if current user is client and status isn't approved
        const ua = await AsyncStorage.getItem("userType");
        setUserType(ua + "");
        if (userType === "client" && response.data.status !== "approved") {
          setShowApprovalModal(true);
        }
      } catch (error) {
        console.error("Error checking chat status:", error);
      }
    };

    checkChatStatus();
  }, [chatId]);
  useEffect(() => {
    if (!socket || !currentUserId || messages.length === 0) return;

    // 🔹 Tell backend user entered the chat screen
    socket.emit("mark_as_seen", { chatId });

    // 🔹 Check for unread messages from other participants
    const unreadMessages = messages.filter(
      (message) =>
        String(message.senderId) !== String(currentUserId) &&
        (!message.readBy || message.readBy.length === 0)
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg.id);
      socket.emit("mark_as_read", { chatId, messageIds });
    }

    // ✅ Listen for read updates from the backend
    socket.on("messages_read", ({ messageIds, readStatuses }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (messageIds.includes(msg.id)) {
            return {
              ...msg,
              readBy: readStatuses
                .filter((rs: { messageId: string }) => rs.messageId === msg.id)
                .map((rs: { participantId: any; readAt: any }) => ({
                  participantId: rs.participantId,
                  readAt: rs.readAt,
                })),
            };
          }
          return msg;
        })
      );
    });

    // 🔁 Cleanup listener
    return () => {
      socket.off("messages_read");
    };
  }, [messages, currentUserId, socket]);

  useEffect(() => {
    if (!socket || !chatId) return;

    // Join the chat when component mounts or chatId changes
    socket.emit("join_chat", { chatId });

    socket.emit("mark_as_seen", { chatId });
    return () => {
      // Leave the chat room when component unmounts or chatId changes
      
      socket.emit("leave_chat", { chatId });
    };
  }, [socket, chatId]);

  useEffect(() => {
    if (!socket) return;

    socket.on("offer_declined", ({ chatId, offerAmount, offerStatus }) => {
      console.log("❌ Offer was declined for chat:", chatId);
      console.log("New offer status:", offerStatus);
      console.log("The offer is", offerAmount);
      setOfferAmount(offerAmount);
      setOfferStatus(offerStatus);
    });
    socket.on("offer_accepted", ({ chatId, offerAmount, offerStatus }) => {
      console.log("Offer was accepted for chat:", chatId);
      console.log("New offer status:", offerStatus);
      console.log("The offer is", offerAmount);
      setOfferAmount(offerAmount);
      setOfferStatus(offerStatus);
    });

    return () => {
      socket.off("offer_declined");
      socket.off("offer_accepted");
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleMessageDeleted = (data: {
      messageId: string;
      updates: { deletedBySender?: string; deletedByReceiver?: string };
      // newContent: string;
    }) => {
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, ...data.updates } : msg
        );
        return updated;
      });
    };
    socket.on("message-deleted", handleMessageDeleted);

    // ✅ Return a cleanup function that calls `.off`
    return () => {
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleMessagesRead = (data: {
      messageIds: string[];
      readStatuses: ReadStatus[];
    }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (!data.messageIds.includes(msg.id)) return msg;

          const statusesForThisMessage = data.readStatuses.filter(
            (rs) => rs.messageId === msg.id
          );

          const newReadStatuses: ReadStatus[] = statusesForThisMessage.map(
            (rs) => ({
              id: rs.id,
              messageId: rs.messageId,
              participantId: rs.participantId,
              readAt: rs.readAt,
            })
          );

          return {
            ...msg,
            readBy: [...(msg.readBy || []), ...newReadStatuses],
            isSeen: statusesForThisMessage.some((rs) => rs.readAt !== null),
          };
        })
      );
    };

    socket.on("messages_read", handleMessagesRead);
    return () => {
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
  
    socket.on('call_initiated', ({ chatId, calleeId, calleeInfo }) => {
      console.log('Call initiated to:', calleeInfo);
      setCallInfo({ calleeId: calleeInfo.id, calleeInfo });
    });
    
    socket.on('incoming_call', ({ chatId, callerId, callerInfo, callType }) => {
      console.log('Incoming call from:', callerInfo);
      setIncomingCallInfo({ callerId, callerInfo });
      setIncomingCall({ chatId, callerId, callerInfo, callType }); // Add callType to the state
      setIncomingCallModalVisible(true);
      playRingtone(); // Play ringtone when incoming call is received
    });

    socket.on('call_accepted', ({ chatId, calleeId, calleeInfo }) => {
      console.log('Call accepted by callee:', calleeInfo);
      setIncomingCallModalVisible(false);
      // Navigate to call screen since call was accepted
      // router.push({
      //   pathname: "/screen/client-screen/call-screen",
      //   params: {
      //     callType: 'video',
      //     receiverName: calleeInfo.firstName + " " + calleeInfo.lastName,
      //     receiverImage: calleeInfo.profileImage,
      //     chatId: chatId,
      //     isCaller: "false",
      //     calleeId: currentUserId,
      //     callerId:otherParticipantId
      //   }
      // });
    });

    socket.on('call_rejected', ({ chatId, calleeId, reason, calleeInfo }) => {
      console.log('Call rejected by callee:', reason);
      AsyncStorage.removeItem("call_rejected");
      AsyncStorage.setItem("call_rejected", "true");
      Alert.alert('Call Rejected', reason || 'Call was rejected');
      const newMessage = {
        chatId,
        messageContent: "The call was rejected",
        messageType: "call",
      };

      socket.emit("send_message", newMessage);
      setIncomingCallModalVisible(false);
      setCallInfo(null);
      setIncomingCall(null);
    });

    socket.on('call_accepted_confirmation', ({ chatId, callerId, callerInfo,callType }) => {
      console.log('Call acceptance confirmed:', callerInfo);
      router.push({
        pathname: "/screen/client-screen/agora-call-room",
        params: {
          callType,
          receiverName: callerInfo?.firstName + " " + callerInfo?.lastName,
          receiverImage: callerInfo?.profileImage,
          chatId: chatId,
          isCaller: "false",
          callerId: otherParticipantId,
          calleeId:currentUserId,
          
        }
      });
    });

    socket.on('call_rejected_confirmation', ({ chatId, callerId, callerInfo }) => {
      console.log('Call rejection confirmed:', callerInfo);
      // Handle call rejection confirmation
    });
  
    return () => {
      stopRingtone(); // Stop ringtone when component unmounts
      socket.off('call_initiated');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_accepted_confirmation');
      socket.off('call_rejected_confirmation');
    };
  }, [socket]);

  const handleBlockUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/block`,
        {
          blockedId: otherParticipantId,
          reason: blockReason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsBlocked(true);
      setBlockModalVisible(false);
      setBlockReason("");
      // Optionally navigate back or show a success message
      router.back();
    } catch (error) {
      console.error("Error blocking user:", error);
      Alert.alert("Error", "Failed to block user. Please try again.");
    }
  };

  const handleUnblockUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/block/${otherParticipantId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsBlocked(false);
      // Optionally show a success message
      Alert.alert("Success", "User has been unblocked");
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", "Failed to unblock user. Please try again.");
    }
  };

  const handleOpenReportModal = () => {
    setMenuModalVisible(false); // Close main menu modal if open
    setReportReason(""); // Clear previous reason
    setReportModalVisible(true);
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      Alert.alert(
        "Report not submitted",
        "Please provide a reason for the report."
      );
      return;
    }
    // Assuming otherParticipantId is the ID of the user to be reported
    if (!otherParticipantId) {
      Alert.alert(
        "Report not submitted",
        "Cannot identify the user to report."
      );
      console.error("otherParticipantId is missing for report");
      return;
    }
    if (!currentUserId) {
      Alert.alert(
        "Report not submitted",
        "Current user ID not found. Cannot submit report."
      );
      return;
    }

    try {
      await submitReport(
        currentUserId as string,
        otherParticipantId as string,
        reportReason
      );
      Alert.alert(
        "Report Submitted",
        "Thank you for your report. We will review it shortly."
      );
      setReportModalVisible(false);
    } catch (error: any) {
      console.error("Failed to submit report:", error);
      Alert.alert(
        "Report Failed",
        error.message || "Could not submit the report. Please try again."
      );
    }
  };

  const getPendingMenuOptions = (): MenuOption[] => [
    {
      icon: <MaterialIcons name="person" size={18} color="#777" />,
      label: "View Profile",
      onPress: () =>
        router.push({
          pathname: "/screen/profile/view-profile/view-page-job-seeker",
          params: { otherParticipantId },
        }),
    },
    {
      icon: <Ionicons name="flag-outline" size={24} color="#FF9500" />,
      label: "Report User",
      onPress: handleOpenReportModal,
    },
  ];

  const getAcceptedMenuOptions = (): MenuOption[] => [
    {
      icon: <MaterialIcons name="delete" size={18} color="#777" />,
      label: "Delete conversation",
      onPress: () => handleDeleteChat(chatId as string),
    },
    {
      icon: <MaterialIcons name="person-off" size={18} color="#777" />,
      label: isBlocked ? "Unblock" : "Block",
      onPress: isBlocked ? handleUnblockUser : () => setBlockModalVisible(true),
    },
    {
      icon: <Ionicons name="flag-outline" size={24} color="#FF9500" />,
      label: "Report User",
      onPress: handleOpenReportModal,
    },
  ];

  const handleBack = () => {
    navigation.goBack();
  };

  const toggleMenuModal = () => {
    if (menuModalVisible) {
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setMenuModalVisible(false));
    } else {
      setMenuModalVisible(true);

      Animated.timing(modalAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };
  const handleSystemMessage = (messageContent: string, messageType: string) => {
    if (!socket) return;

    try {
      const newMessage = {
        chatId,
        messageContent,
        messageType,
      };

      // Emit message through socket
      socket.emit("send_message", newMessage);

      // Clear input
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  const handleAcceptChat = () => {
    setAcceptModalVisible(true);
  };

  const confirmAcceptChat = () => {
    handleApprove();
    setCurrentChatStatus("approved");
    setAcceptModalVisible(false);
    setMenuModalVisible(false);
    // Show offer modal after accepting chat
    setTimeout(() => {
      setOfferModalVisible(true);
    }, 500);
  };

  const handleRejectChat = () => {
    setRejectModalVisible(true);
  };

  const confirmRejectChat = () => {
    handleReject();
    setCurrentChatStatus("declined");
    setRejectModalVisible(false);

    setTimeout(() => {
      navigation.goBack();
    }, 500);
  };

  const handleInitiateAcceptOffer = () => {
    setAcceptOfferConfirmationVisible(true);
  };

  const handleAcceptOffer = () => {
    if (!socket) return;

    socket.emit("accept_offer", { chatId, jobRequestId }, () => {});
    setAcceptOfferConfirmationVisible(false);

    setOfferStatus("accepted");
    setOfferModalVisible(false);
    
    // Add system message for offer acceptance
    handleSystemMessage("The offer has been accepted", "system");
  };

  const handleRejectOffer = async () => {
    if (!socket) return;
    socket.emit("reject_offer", { chatId }, () => {});
    setOfferStatus("declined");
    setOfferModalVisible(false);
    
    // Add system message for offer rejection
    handleSystemMessage("The offer has been rejected", "system");
  };

  const formatTime = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderMessageItem = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const isCurrentUser = String(item.senderId) === String(currentUserId);
    const isLastMessage = index === 0; // Since list is inverted
    const showStatus = isCurrentUser && isLastMessage;
    const messageDate = new Date(item.sentAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentMessageDate = new Date(item.sentAt).toDateString();
    const nextMessageDate =
      index === messages.length - 1
        ? null
        : new Date(messages[index + 1].sentAt).toDateString();

    const showDateSeparator =
      index === messages.length - 1 ||
      (nextMessageDate && currentMessageDate !== nextMessageDate);

    // SYSTEM MESSAGE
    if (item.messageType === "system") {
      let customMessage = item.messageContent;
      const match = item.messageContent.match(/\d+/); // Finds the first number
      const amount = match ? match[0] : "";
      if (
        item.messageContent.toLowerCase().includes("client") &&
        item.messageContent.toLowerCase().includes("declined") &&
        item.messageContent.toLowerCase().includes("chat")
      ) {
        customMessage = `You declined ${receiverName ?? "the recipient"}'s chat request`;
      } else if (
        item.messageContent.toLowerCase().includes("client") &&
        item.messageContent.toLowerCase().includes("accepted") &&
        item.messageContent.toLowerCase().includes("chat")
      ) {
        customMessage = `You accepted ${receiverName ?? "the recipient"}'s chat request`;
      } else if (
        item.messageContent.toLocaleLowerCase().includes("offer") &&
        item.messageContent.toLocaleLowerCase().includes("accepted")
      ) {
        customMessage = `You accepted the offer`;
      } else if (
        item.messageContent.toLocaleLowerCase().includes("offer") &&
        !item.messageContent.toLocaleLowerCase().includes("declined")
      ) {
        customMessage = `${receiverName} sent an offer of ${amount} pesos`;
      } else if (
        item.messageContent.toLocaleLowerCase().includes("offer") &&
        item.messageContent.toLocaleLowerCase().includes("declined")
      ) {
        customMessage = `You declined the offer`;
      }
      return (
        <View style={styles.systemMessageContainer}>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>{messageDate}</Text>
            </View>
          )}
          <View style={styles.systemMessageBubble}>
            <Text style={styles.systemMessageText}>{customMessage}</Text>
          </View>
        </View>
      );
    }

    // IMAGE MESSAGE
    if (item.messageType === "image") {
      const imageMessages = messages.filter((m) => {
        const isSender = m.senderId === currentUserId;
        if (isSender && m.deletedBySender === "yes") return false;
        if (!isSender && m.deletedByReceiver === "yes") return false;
        return m.messageType === "image";
      });
      const imageArray = imageMessages.map((msg) => {
        return `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/messages/${msg.messageContent.split("messages_files/")[1]}`;
      });
      const imageUrl = `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/messages/${item.messageContent.split("messages_files/")[1]}`;
      const isDeletedForEveryone = item.deletedBySender === "yes" && item.deletedByReceiver === "yes";
      const isVisibleToUser = !shouldHideMessage(item, currentUserId) || isDeletedForEveryone;
      if (!isVisibleToUser) return null;
      return (
        <View>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>{messageDate}</Text>
            </View>
          )}
          <View
            style={[
              styles.messageRow,
              isCurrentUser ? styles.sentMessageRow : styles.receivedMessageRow,
            ]}
          >
            {/* Avatar on left for received */}
            {!isCurrentUser && recipientPic && (
              <Image
                source={{
                  uri: profileImage
                    ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${(profileImage + "").split("profiles/")[1] || ""}`
                    : undefined,
                }}
                style={styles.senderAvatar}
                defaultSource={require("assets/images/client-user.png")}
              />
            )}
            {/* Image message */}
            <TouchableOpacity
              onLongPress={
                shouldHideMessage(item, currentUserId)
                  ? undefined
                  : () => handleLongPress(item)
              }
              delayLongPress={300}
              activeOpacity={1}
              disabled={shouldHideMessage(item, currentUserId)}
              onPress={() => {
                if (
                  !shouldHideMessage(item, currentUserId) &&
                  item.messageType === "image"
                ) {
                  const filteredImageIndex = imageMessages.findIndex(
                    (msg) => msg.id === item.id
                  );
                  setVisibleImageIndex(filteredImageIndex);
                }
              }}
            >
              {isDeletedForEveryone ? (
                <View style={styles.deletedImagePlaceholder}>
                  <Text style={styles.deletedMessageText}>
                    {item.senderId === currentUserId
                      ? "You removed an image"
                      : `${receiverName ?? "Someone"} removed an image`}
                  </Text>
                </View>
              ) : (
                <>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.imageMessage}
                    resizeMode="cover"
                  />
                  {showStatus && (
                    <Text style={styles.statusText}>{getStatusText(item)}</Text>
                  )}
                  <Text style={styles.imageTime}>{formatTime(item.sentAt)}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {/* Fullscreen Image Modal */}
          <Modal
            visible={visibleImageIndex !== null}
            transparent
            animationType="fade"
          >
            <View style={styles.fullscreenContainer}>
              {visibleImageIndex !== null && (
                <>
                  <Image
                    source={{ uri: imageArray[visibleImageIndex ?? 0] }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setVisibleImageIndex(null)}
                  >
                    <Text style={styles.buttonText}>✕</Text>
                  </TouchableOpacity>
                  {visibleImageIndex !== null && visibleImageIndex > 0 && (
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() =>
                        setVisibleImageIndex((visibleImageIndex ?? 1) - 1)
                      }
                    >
                      <Text style={styles.buttonText}>‹</Text>
                    </TouchableOpacity>
                  )}
                  {visibleImageIndex !== null && visibleImageIndex < imageArray.length - 1 && (
                    <TouchableOpacity
                      style={styles.nextButton}
                      onPress={() =>
                        setVisibleImageIndex((visibleImageIndex ?? 0) + 1)
                      }
                    >
                      <Text style={styles.buttonText}>›</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </Modal>
        </View>
      );
    }

    // FILE MESSAGE
    if (item.messageType === "file") {
      const fileUrl = `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/messages/${item.messageContent.split("messages_files/")[1]}`;
      const fileName = item.messageContent ? item.messageContent.split("messages_files/")[1] : '';
      const fileExtension = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
      const isDeletedForEveryone = item.deletedBySender === 'yes' && item.deletedByReceiver === 'yes';
      const isVisibleToUser = !shouldHideMessage(item, currentUserId) || isDeletedForEveryone;
      const getFileIcon = () => {
        switch (fileExtension) {
          case 'pdf':
            return <Ionicons name="document-text" size={24} color="#ff3b30" />;
          case 'doc':
          case 'docx':
            return <Ionicons name="document" size={24} color="#007AFF" />;
          case 'txt':
            return <Ionicons name="text" size={24} color="#34C759" />;
          default:
            return <Ionicons name="document" size={24} color="#8E8E93" />;
        }
      };
      if (!isVisibleToUser) return null;
      return (
        <View>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>{messageDate}</Text>
            </View>
          )}
          <View
            style={[
              styles.messageRow,
              isCurrentUser ? styles.sentMessageRow : styles.receivedMessageRow,
            ]}
          >
            {!isCurrentUser && recipientPic && (
              <Image
                source={{
                  uri: profileImage
                    ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${(profileImage+"").split("profiles/")[1]|| ''}`
                    : undefined
                }}
                style={styles.senderAvatar}
                defaultSource={require("assets/images/client-user.png")}
              />
            )}
            <TouchableOpacity
              onLongPress={
                shouldHideMessage(item, currentUserId)
                  ? undefined
                  : () => handleLongPress(item)
              }
              delayLongPress={300}
              activeOpacity={0.7}
              disabled={shouldHideMessage(item, currentUserId)}
              onPress={() => {
                if (!shouldHideMessage(item, currentUserId)) {
                  Linking.openURL(fileUrl).catch((err) => {
                    Alert.alert('Error', 'Could not open the file');
                  });
                }
              }}
              style={[
                styles.fileMessageBubble,
                isCurrentUser ? styles.sentFileBubble : styles.receivedFileBubble
              ]}
            >
              {isDeletedForEveryone ? (
                <View style={styles.deletedFilePlaceholder}>
                  <Text style={styles.deletedMessageText}>
                    {item.senderId === currentUserId
                      ? 'You removed a file'
                      : `${receiverName ?? 'Someone'} removed a file`}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.fileIconContainer}>{getFileIcon()}</View>
                  <View style={styles.fileInfoContainer}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {fileName}
                    </Text>
                    <Text style={styles.fileExtension}>
                      {fileExtension?.toUpperCase()}
                    </Text>
                  </View>
                  {showStatus && (
                    <Text style={styles.statusText}>{getStatusText(item)}</Text>
                  )}
                  <Text style={styles.fileTime}>{formatTime(item.sentAt)}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }


    if (item.messageType === 'call') {
      const isDeletedForEveryone = item.deletedBySender === 'yes' && item.deletedByReceiver === 'yes';
      const isVisibleToUser = !shouldHideMessage(item, currentUserId) || isDeletedForEveryone;

      return isVisibleToUser ? (
        <View>
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>{messageDate}</Text>
            </View>
          )}
          <View
            style={[
              styles.messageRow,
              isCurrentUser ? styles.sentMessageRow : styles.receivedMessageRow,
            ]}
          >
            {!isCurrentUser && recipientPic && (
              <Image
                source={{
                  uri: profileImage
                    ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${
                        (profileImage + "").split("profiles/")[1] || ""
                      }`
                    : undefined,
                }}
                style={styles.senderAvatar}
                defaultSource={require("assets/images/client-user.png")}
              />
            )}
            <View
              style={[
                styles.callMessageBubble,
                isCurrentUser ? styles.sentCallBubble : styles.receivedCallBubble,
              ]}
            >
              <View style={styles.callMessageContent}>
                <Ionicons 
                    name={
                      item.messageContent.toLowerCase().includes('rejected') || 
                      item.messageContent.toLowerCase().includes('voice') 
                        ? "call" 
                        : "videocam"
                    }
                  size={20} 
                  color={isCurrentUser ? "#fff" : "#0b216f"} 
                  style={styles.callIcon}
                />
                <Text
                  style={[
                    styles.callMessageText,
                    isCurrentUser ? styles.sentCallMessageText : styles.receivedCallMessageText,
                  ]}
                >
                  {item.messageContent}
                </Text>
              </View>
              <Text
                style={[
                  styles.callMessageTime,
                  isCurrentUser ? styles.sentCallMessageTime : styles.receivedCallMessageTime,
                ]}
              >
                {formatTime(item.sentAt)}
              </Text>
            </View>
          </View>
          {showStatus && <Text style={styles.statusText}>{statusText}</Text>}
        </View>
      ) : null;
    }


    // TEXT MESSAGE (default)
    if (isCurrentUser) item.messageType = 'sent';
    else if (!isCurrentUser) item.messageType = 'received';
    const isDeletedForEveryone = item.deletedBySender === 'yes' && item.deletedByReceiver === 'yes';
    const isVisibleToUser = !shouldHideMessage(item, currentUserId) || isDeletedForEveryone;
    if (!isVisibleToUser) return null;
    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{messageDate}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageRow,
            item.messageType === 'sent' ? styles.sentMessageRow : styles.receivedMessageRow
          ]}
        >
          {item.messageType === 'received' && recipientPic && (
            <Image
              source={{
                uri: profileImage
                  ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${(profileImage+'').split("profiles/")[1]|| ''}`
                  : undefined
              }}
              style={styles.senderAvatar}
              defaultSource={require('assets/images/client-user.png')}
            />
          )}
          <View
            style={[
              styles.messageBubble,
              item.messageType === 'sent' ? styles.sentBubble : styles.receivedBubble
            ]}
          >
            <TouchableOpacity
              onLongPress={
                isDeletedForEveryone ? undefined : () => handleLongPress(item)
              }
              delayLongPress={300}
              activeOpacity={1}
              disabled={isDeletedForEveryone}
            >
              {isDeletedForEveryone ? (
                <Text style={styles.deletedMessageText}>
                  {item.senderId === currentUserId
                    ? 'You removed a message'
                    : `${receiverName ?? 'Someone'} removed a message`}
                </Text>
              ) : (
                <>
                  <Text
                    style={[
                      styles.messageText,
                      item.messageType === 'sent'
                        ? styles.sentMessageText
                        : styles.receivedMessageText
                    ]}
                  >
                    {item.messageContent}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      item.messageType === 'sent'
                        ? styles.sentMessageTime
                        : styles.receivedMessageTime
                    ]}
                  >
                    {formatTime(item.sentAt)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {showStatus && <Text style={styles.statusText}>{getStatusText(item)}</Text>}
      </View>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>
        Send a message to start the conversation
      </Text>
    </View>
  );

  const modalScale = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const modalOpacity = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuOptions =
    currentChatStatus === "approved"
      ? getAcceptedMenuOptions()
      : getPendingMenuOptions();

  const checkBlockStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/block/check/${otherParticipantId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsBlocked(response.data.isBlocked);
    } catch (error) {
      console.error("Error checking block status:", error);
    }
  };

  useEffect(() => {
    checkBlockStatus();
  }, [otherParticipantId]);

  const checkIfBlockedByJobSeeker = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/users/${currentUserId}/blocked-by`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Check if the job seeker's ID is in the list of users who blocked the client
      const isBlocked = response.data.includes(otherParticipantId);
      setIsBlockedByJobSeeker(isBlocked);
    } catch (error) {
      console.error("Error checking if blocked by job seeker:", error);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      checkIfBlockedByJobSeeker();
    }
  }, [currentUserId]);
  const handleFilePress = async () => {
    try {
      setIsUploading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 
              'application/msword', 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
              'text/plain'],
        copyToCacheDirectory: true
      });
  
      if (result.canceled) {
        setIsUploading(false);
        return;
      }
  
      const file = result.assets[0];
      
      // Check file size (e.g., 10MB limit)
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File size must be less than 10MB');
        console.log('File size must be less than 10MB');
        setIsUploading(false);
        return;
      }
  
      // Get the file mime type
      const mimeType = file.mimeType || 'application/octet-stream';
      
      // Validate file type on client side again
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(mimeType)) {
        Alert.alert('Error', 'Invalid file type. Please upload PDF, Word, or text files only.');
        setIsUploading(false);
        return;
      }
  
      const base64FileData = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      if (!socket) {
        throw new Error('Socket not initialized');
      }
      const dataUri = `data:${file.mimeType};base64,${base64FileData}`;
      socket.emit('upload_file', {
        senderId: currentUserId,
        chatId: chatId,
        file: dataUri,
        fileName: file.name,
        fileType: mimeType, // Send the actual mimeType instead of extension
      });
  
      console.log('File upload initiated:', file.name);
  
    } catch (error) {
      console.error('Error picking or uploading file:', error);
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Add these functions before the return statement
  const handleVoiceCall = () => {
    if(!socket) return;
    socket.emit('initiate_call', { 
      chatId, 
      callerId: currentUserId,
      calleeId: otherParticipantId,
      callType: 'voice'
    });
    router.push({
      pathname: "/screen/client-screen/agora-call-room",
      params: { 
        callType: 'voice',
        receiverName: receiverName,
        receiverImage: profileImage,
        chatId: chatId,
        isCaller: "true",
        callerId: currentUserId,
        calleeId: otherParticipantId,
        
      }
    });
  };

  const handleVideoCall = () => {
    if(!socket) return;
    
    // Emit initiate_call event
    socket.emit('initiate_call', { 
      chatId, 
      callerId: currentUserId,
      calleeId: otherParticipantId,
      callType: 'video'
    });

    // Navigate to call screen
    router.push({
      pathname: "/screen/client-screen/agora-call-room",
      params: { 
        callType: 'video',
        receiverName: receiverName,
        receiverImage: profileImage,
        chatId: chatId,
        isCaller: "true",
        callerId: currentUserId,
        calleeId: otherParticipantId
      }
    });
  };

  const handleAcceptCall = () => {
    if (!socket || !incomingCall) return;
    
    stopRingtone(); // Stop ringtone when call is accepted
    
    socket.emit('accept_call', {
      chatId: incomingCall.chatId,
      callerId: incomingCall.callerId,
      calleeId: currentUserId,
      callType: incomingCall.callType
    });

    setIncomingCall(null);
    setIncomingCallInfo(null);
  };

  const handleRejectCall = () => {
    if (!socket || !incomingCall) return;
    
    stopRingtone(); // Stop ringtone when call is rejected
    
    socket.emit('reject_call', {
      chatId: incomingCall.chatId,
      callerId: incomingCall.callerId,
      calleeId: currentUserId,
      reason: 'Call rejected by user',
    });

    setIncomingCall(null);
    setIncomingCallInfo(null);
  };

  // Add this function to play the ringtone
  const playRingtone = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('assets/sounds/ringtone.mp3'), // Make sure to add a ringtone file to your assets
        { isLooping: true }
      );
      setRingtoneSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  // Add this function to stop the ringtone
  const stopRingtone = async () => {
    try {
      if (ringtoneSound) {
        await ringtoneSound.stopAsync();
        await ringtoneSound.unloadAsync();
        setRingtoneSound(null);
      }
    } catch (error) {
      console.error('Error stopping ringtone:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View
        style={[
          styles.header,
          Platform.OS === "ios" ? styles.iosHeader : styles.androidHeader,
        ]}
      >
        <TouchableOpacity onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/screen/profile/view-profile/view-page-job-seeker",
              params: { otherParticipantId,isFromChat:"true" },
            })
          }
        >
          <View style={styles.headerUserInfo}>
            <Image
              source={{
                uri: profileImage
                  ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${(profileImage + "").split("profiles/")[1] || ""}`
                  : undefined,
              }}
              style={styles.recipientAvatar}
            />
            <Text style={styles.recipientName} numberOfLines={1}>
              {truncateName(receiverName as string)}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={handleVoiceCall}
          >
            <Ionicons name="call-outline" size={24} color="#0b216f" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={handleVideoCall}
          >
            <Ionicons name="videocam-outline" size={24} color="#0b216f" />
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleMenuModal} style={styles.headerIconButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {currentChatStatus === "pending" && (
        <View style={styles.requestBanner}>
          <Text style={styles.requestText}>
            Chat request from {receiverName}
          </Text>
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleRejectChat}
            >
              <MaterialIcons name="cancel" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptChat}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {currentChatStatus === "approved" &&
        currentOfferStatus == "pending" &&
        offerModalVisible && (
          <View style={styles.offerBanner}>
            <View style={styles.offerContent}>
              <MaterialIcons
                name="attach-money"
                size={24}
                color="#0b8043"
                style={styles.offerIcon}
              />
              <View style={styles.offerTextContainer}>
                <Text style={styles.offerTitle}>
                  Payment Offer: {offerAmount}
                </Text>
                <Text style={styles.offerDescription}>
                  {receiverName} has sent you a payment offer. Would you like to
                  accept?
                </Text>
              </View>
            </View>
            <View style={styles.offerActions}>
              <TouchableOpacity
                style={styles.offerRejectButton}
                onPress={handleRejectOffer}
              >
                <MaterialIcons name="cancel" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.offerAcceptButton}
                onPress={handleInitiateAcceptOffer}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      {/* Offer Acceptance Confirmation Modal */}
      <Modal
        transparent
        visible={acceptOfferConfirmationVisible}
        animationType="fade"
        onRequestClose={() => setAcceptOfferConfirmationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmModalTitle}>Accept Offer?</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to accept the {offerAmount} payment offer
              from {receiverName}?
            </Text>
            <Text style={styles.warningText}>
              There's no turning back once you accept this offer.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAcceptOfferConfirmationVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptConfirmButton}
                onPress={handleAcceptOffer}
              >
                <Text style={styles.confirmButtonText}>Yes, Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={rejectModalVisible}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContainer}>
            <Text style={styles.rejectModalTitle}>Reject Chat?</Text>
            <Text style={styles.rejectModalText}>
              Are you sure you want to reject this chat request from{" "}
              {receiverName}?
            </Text>
            <View style={styles.rejectModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmRejectChat}
              >
                <Text style={styles.confirmButtonText}>Yes, Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={acceptModalVisible}
        animationType="fade"
        onRequestClose={() => setAcceptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmModalTitle}>Accept Chat?</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to accept this chat request from{" "}
              {receiverName}?
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAcceptModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptConfirmButton}
                onPress={confirmAcceptChat}
              >
                <Text style={styles.confirmButtonText}>Yes, Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={menuModalVisible}
        animationType="none"
        onRequestClose={toggleMenuModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={toggleMenuModal}
        >
          <Animated.View
            style={[
              styles.dropdownMenu,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuOption,
                  index === menuOptions.length - 1
                    ? styles.lastMenuOption
                    : null,
                ]}
                onPress={() => {
                  toggleMenuModal();
                  option.onPress?.();
                }}
              >
                <View style={styles.menuOptionIcon}>{option.icon}</View>
                <Text style={styles.menuOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={actionSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setActionSheetVisible(false)}
      >
        <View style={styles.menumodalOverlay}>
          <View style={styles.menuactionSheet}>
            <TouchableOpacity
              style={styles.menuactionButton}
              onPress={() => {
                if (selectedMessage?.messageContent) {
                  Clipboard.setStringAsync(selectedMessage.messageContent);
                }
                setActionSheetVisible(false);
              }}
            >
              <Text style={styles.menuactionText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuactionButton, styles.menudeleteButton]}
              onPress={() => {
                handleDeleteMessage("forMe");
                setActionSheetVisible(false);
              }}
            >
              <Text style={[styles.menuactionText, styles.menudeleteText]}>
                Delete for me
              </Text>
            </TouchableOpacity>

            {canDeleteForEveryone(selectedMessage) && (
              <TouchableOpacity
                style={[styles.menuactionButton, styles.menudeleteButton]}
                onPress={() => {
                  handleDeleteMessage("forEveryone");
                  setActionSheetVisible(false);
                }}
              >
                <Text style={[styles.menuactionText, styles.menudeleteText]}>
                  Delete for Everyone
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menucancelButton}
              onPress={() => setActionSheetVisible(false)}
            >
              <Text style={styles.menucancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          currentChatStatus === "approved" ? renderEmptyChat : null
        }
        inverted={messages.length > 0}
      />

      {currentChatStatus === "approved" && (
        <>
          {isBlocked || isBlockedByJobSeeker ? (
            <View style={styles.blockedContainer}>
              <MaterialIcons name="person-off" size={50} color="#ff3b30" />
              <Text style={styles.blockedText}>
                {isBlocked
                  ? `You have blocked ${receiverName}`
                  : `${receiverName} has blocked you`}
              </Text>
              {isBlocked && (
                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={handleUnblockUser}
                >
                  <Text style={styles.unblockButtonText}>Unblock User</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
              style={styles.inputContainer}
            >
              <View style={styles.attachmentButtons}>
                <TouchableOpacity 
                  style={styles.attachButton} 
                  onPress={handleAttachPress}
                >
                  <MaterialIcons name="image" size={24} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.attachButton} 
                  onPress={handleFilePress}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#999" />
                  ) : (
                    <MaterialIcons name="attach-file" size={24} color="#999" />
                  )}
                </TouchableOpacity>
              </View>

              <ActionSheet
                ref={actionSheetRef}
                title={"Attach Image"}
                options={["Take Photo", "Choose from Gallery", "Cancel"]}
                cancelButtonIndex={2}
                onPress={handleOptionPress}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Write a message..."
                value={messageInput}
                onChangeText={setMessageInput}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  messageInput.trim().length === 0 && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={messageInput.trim().length === 0}
              >
                <MaterialIcons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </KeyboardAvoidingView>
          )}
        </>
      )}

      {currentChatStatus === 'rejected' && (
        <View style={styles.rejectedContainer}>
          <Ionicons name="close-circle" size={50} color="#ff3b30" />
          <Text style={styles.rejectedText}>
            You rejected {receiverName}'s chat request
          </Text>
        </View>
      )}

      <Modal
        transparent
        visible={blockModalVisible}
        animationType="fade"
        onRequestClose={() => setBlockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.blockModalContainer}>
            <Text style={styles.blockModalTitle}>Block User</Text>
            <Text style={styles.blockModalText}>
              Are you sure you want to block {receiverName}? You won't be able
              to send or receive messages from them.
            </Text>
            <TextInput
              style={styles.blockReasonInput}
              placeholder="Reason for blocking (optional)"
              value={blockReason}
              onChangeText={setBlockReason}
              multiline
            />
            <View style={styles.blockModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setBlockModalVisible(false);
                  setBlockReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.blockButton}
                onPress={handleBlockUser}
              >
                <Text style={styles.confirmButtonText}>Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => {
          setReportModalVisible(!reportModalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Report User</Text>
            <TextInput
              style={styles.reportInput}
              placeholder="Please provide a reason for reporting..."
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <View style={styles.modalButtonContainer}>
              <Button
                title="Cancel"
                onPress={() => setReportModalVisible(false)}
                color="#777"
              />
              <Button
                title="Submit Report"
                onPress={handleReportSubmit}
                color="#ff3b30"
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.floatingCardContainer}>
          <View style={styles.floatingCard}>
            <View style={styles.floatingCardContent}>
              <Image
                source={{
                  uri: profileImage
                    ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${(profileImage + "").split("profiles/")[1] || ""}`
                    : undefined
                }}
                style={styles.floatingCardAvatar}
              />
              <View style={styles.floatingCardTextContainer}>
                <Text style={styles.floatingCardTitle}>Incoming Call</Text>
                <Text style={styles.floatingCardName}>
                  {receiverName}
                </Text>
              </View>
            </View>
            
            <View style={styles.floatingCardButtons}>
              <TouchableOpacity
                style={[styles.floatingCardButton, styles.declineButton]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="call" size={24} color="#fff" style={styles.rotateIcon} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.floatingCardButton, styles.acceptButton]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="call" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Incoming Call Floating Card */}
      <Modal
        transparent
        visible={incomingCallModalVisible}
        animationType="slide"
        onRequestClose={() => setIncomingCallModalVisible(false)}
      >
        <View style={styles.floatingCardContainer}>
          <View style={styles.floatingCard}>
            <View style={styles.floatingCardContent}>
              <Image
                source={{
                  uri: incomingCallInfo?.callerInfo?.profileImage
                    ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${(incomingCallInfo.callerInfo.profileImage + "").split("profiles/")[1] || ""}`
                    : undefined
                }}
                style={styles.floatingCardAvatar}
                defaultSource={require("assets/images/client-user.png")}
              />
              <View style={styles.floatingCardTextContainer}>
                <Text style={styles.floatingCardTitle}>
                  Incoming {incomingCall?.callType === 'voice' ? 'Voice' : 'Video'} Call
                </Text>
                <Text style={styles.floatingCardName}>
                  {(incomingCallInfo?.callerInfo?.firstName + " " + incomingCallInfo?.callerInfo?.lastName) || 'Unknown Caller'}
                </Text>
              </View>
            </View>
            
            <View style={styles.floatingCardButtons}>
              <TouchableOpacity
                style={[styles.floatingCardButton, styles.declineButton]}
                onPress={() => {
                  handleRejectCall();
                  setIncomingCallModalVisible(false);
                }}
              >
                <Ionicons name="call" size={24} color="#fff" style={styles.rotateIcon} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.floatingCardButton, styles.acceptButton]}
                onPress={() => {
                  handleAcceptCall();
                  setIncomingCallModalVisible(false);
                }}
              >
                <Ionicons 
                  name={incomingCall?.callType === 'voice' ? "call" : "videocam"} 
                  size={24} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
    zIndex: 10,
  },
  iosHeader: {
    paddingTop: Platform.OS === "ios" ? 10 : 10,
  },
  androidHeader: {
    marginTop: StatusBar.currentHeight || 0,
    paddingTop: 25,
  },
  headerUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  recipientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    maxWidth: '60%',
  },
  moreButton: {
    padding: 8,
  },
  messageList: {
    flexGrow: 1,
    paddingVertical: 10,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-end",
  },
  sentMessageRow: {
    justifyContent: "flex-end",
  },
  receivedMessageRow: {
    justifyContent: "flex-start",
  },
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 8,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 18,
    maxWidth: "70%",
  },
  sentBubble: {
    backgroundColor: "#0b216f",
    borderBottomRightRadius: 5,
    marginRight: 5,
  },
  receivedBubble: {
    backgroundColor: "#e9e9eb",
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
  },
  sentMessageText: {
    color: "#fff",
  },
  receivedMessageText: {
    color: "#000",
  },
  messageTime: {
    fontSize: 12,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  sentMessageTime: {
    color: "rgba(255,255,255,0.7)",
  },
  receivedMessageTime: {
    color: "#8e8e93",
  },
  systemMessageContainer: {
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  systemMessageBubble: {
    backgroundColor: "rgba(142, 142, 147, 0.12)",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxWidth: "80%",
  },
  systemMessageText: {
    fontSize: 14,
    color: "#636366",
    textAlign: "center",
  },
  systemMessageTime: {
    fontSize: 11,
    color: "#8e8e93",
    textAlign: "center",
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    marginBottom: Platform.OS === "ios" ? 0 : 0,
    paddingBottom: Platform.OS === "android" ? 55 : 55,
  },
  attachmentButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    padding: 8,
    marginRight: 4, // Add some spacing between the buttons
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#f2f2f7",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0b216f",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#b0c0e0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownMenu: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 50,
    right: 15,
    width: SCREEN_WIDTH * 0.6,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  lastMenuOption: {
    borderBottomWidth: 0,
  },
  menuOptionIcon: {
    marginRight: 12,
  },
  menuOptionText: {
    fontSize: 16,
    color: "#333",
  },
  requestBanner: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  requestText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  requestActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 5,
  },
  rejectButton: {
    backgroundColor: "#ff3b30",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
  },
  acceptButton: {
    backgroundColor: "#34c759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "500",
    marginLeft: 5,
  },
  rejectModalContainer: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmModalContainer: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0b8043",
  },
  rejectModalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  confirmModalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
    color: "#666",
  },
  warningText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#ff3b30",
    fontWeight: "500",
  },
  rejectModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
  },
  acceptConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: "#0b8043",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  rejectedContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto', // This will push it to the bottom
  },
  rejectedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8e8e93",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8e8e93",
    textAlign: "center",
  },
  offerBanner: {
    backgroundColor: "#f0f8f0",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  offerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  offerIcon: {
    marginRight: 10,
  },
  offerTextContainer: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0b8043",
    marginBottom: 4,
  },
  offerDescription: {
    fontSize: 14,
    color: "#666",
  },
  offerActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  offerAcceptButton: {
    backgroundColor: "#0b8043",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
  },
  offerRejectButton: {
    backgroundColor: "#8e8e93",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
  },
  dateSeparator: {
    alignSelf: "center",
    backgroundColor: "#e0e0e0",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: "row",
  },
  sentMessageContainer: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  receivedMessageContainer: {
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  imageMessageBubble: {
    maxWidth: "80%",
    borderRadius: 12,
    backgroundColor: "#f0f0f0", // You can change this color for sent and received
    overflow: "hidden",
    marginRight: 3,
  },
  imageMessage: {
    width: 250, // Adjust width for your design
    height: 150, // Adjust height for your design
    borderRadius: 12,
    marginRight: 3,
  },
  modalCloseArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "80%",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 30,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: "50%",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 30,
  },
  nextButton: {
    position: "absolute",
    right: 20,
    top: "50%",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 24,
    color: "white",
  },
  imageTime: {
    fontSize: 12,
    color: "gray",
    alignSelf: "flex-end",
    marginTop: 2,
    marginRight: 3,
  },

  menumodalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuactionSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuactionButton: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuactionText: {
    fontSize: 18,
    textAlign: "center",
  },
  menudeleteButton: {
    marginTop: 8,
  },
  menudeleteText: {
    color: "red",
  },
  menucancelButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  menucancelText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#007AFF",
  },
  deletedMessageText: {
    fontStyle: "italic",
    color: "#999",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  reportInput: {
    width: "100%",
    minHeight: 100,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },

deletedMessageTime: {
  opacity: 0.6, // Make timestamp slightly faded for deleted messages
},
deletedImagePlaceholder: {
  width: 200, // Match your image width
  height: 200, // Match your image height
  backgroundColor: '#f0f0f0',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 8,
},
messageStatusText: {
  fontSize: 12,
  color: '#888',
  marginTop: 4,
  textAlign: 'right'
},
statusText: {
  fontSize: 10,
  color: '#555', // Dark grey, better contrast
  alignSelf: 'flex-end',
  marginTop: -15,
  marginRight: 5,
},
blockModalContainer: {
  width: SCREEN_WIDTH * 0.85,
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 20,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
},
blockModalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
  color: '#ff3b30',
},
blockModalText: {
  fontSize: 16,
  textAlign: 'center',
  marginBottom: 20,
  color: '#666',
},
blockReasonInput: {
  width: '100%',
  height: 100,
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 10,
  marginBottom: 20,
  textAlignVertical: 'top',
},
blockButton: {
  flex: 1,
  paddingVertical: 12,
  marginLeft: 8,
  backgroundColor: '#ff3b30',
  borderRadius: 8,
  alignItems: 'center',
},
blockModalButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
},
blockedContainer: {
  padding: 20,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#e0e0e0',
  alignItems: 'center',
  justifyContent: 'center',
},
blockedText: {
  fontSize: 16,
  color: '#666',
  textAlign: 'center',
  marginTop: 10,
  marginBottom: 15,
},
unblockButton: {
  backgroundColor: '#0b216f',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 20,
},
unblockButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '500',
},
fileMessageBubble: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  borderRadius: 18,
  maxWidth: '70%',
  marginHorizontal: 8,
},
sentFileBubble: {
  backgroundColor: '#0b216f',
  borderBottomRightRadius: 5,
},
receivedFileBubble: {
  backgroundColor: '#e9e9eb',
  borderBottomLeftRadius: 5,
},
fileIconContainer: {
  marginRight: 12,
},
fileInfoContainer: {
  flex: 1,
},
fileName: {
  fontSize: 14,
  fontWeight: '500',
  color: '#000',
  marginBottom: 4,
},
fileExtension: {
  fontSize: 12,
  color: '#666',
},
fileTime: {
  fontSize: 12,
  color: '#8e8e93',
  marginTop: 4,
},
deletedFilePlaceholder: {
  padding: 10,
  alignItems: 'center',
},

headerActions: {
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 'auto', // This will push the actions to the right
},
headerIconButton: {
  padding: 8,
  marginLeft: 4,
},

floatingCardContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-start',
  paddingTop: Platform.OS === 'ios' ? 50 : 30,
},
floatingCard: {
  backgroundColor: '#fff',
  marginHorizontal: 20,
  borderRadius: 15,
  padding: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
},
floatingCardContent: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 15,
},
floatingCardAvatar: {
  width: 50,
  height: 50,
  borderRadius: 25,
  marginRight: 15,
},
floatingCardTextContainer: {
  flex: 1,
},
floatingCardTitle: {
  fontSize: 16,
  color: '#666',
  marginBottom: 4,
},
floatingCardName: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
},
floatingCardButtons: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: '#eee',
},
floatingCardButton: {
  width: 50,
  height: 50,
  borderRadius: 25,
  justifyContent: 'center',
  alignItems: 'center',
  marginHorizontal: 20,
},

declineButton: {
  backgroundColor: '#ff3b30',
},
rotateIcon: {
  transform: [{ rotate: '135deg' }],
},

callMessageBubble: {
  padding: 12,
  borderRadius: 18,
  maxWidth: '100%',
  borderWidth: 1,
  borderColor: '#0b216f',
},
sentCallBubble: {
  backgroundColor: '#0b216f',
  borderBottomRightRadius: 5,
  marginRight: 5,
},
receivedCallBubble: {
  backgroundColor: '#fff',
  borderBottomLeftRadius: 5,
},
callMessageContent: {
  alignItems: 'center',
},
callIcon: {
  marginRight: 8,
},
callMessageText: {
  fontSize: 16,
  flex: 1,
},
sentCallMessageText: {
  color: '#fff',
},
receivedCallMessageText: {
  color: '#0b216f',
},
callMessageTime: {
  fontSize: 12,
  alignSelf: 'flex-end',
  marginTop: 4,
},
sentCallMessageTime: {
  color: 'rgba(255,255,255,0.7)',
},
receivedCallMessageTime: {
  color: '#8e8e93',
},
});

export default ChatScreen;

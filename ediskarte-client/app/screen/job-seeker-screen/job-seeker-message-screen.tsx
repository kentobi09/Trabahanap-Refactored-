import React, { useEffect, useState, useRef } from "react";
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
  Button,
  ActivityIndicator,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { safePush, safeReplace, safeBack } from "../../constants/navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Socket } from 'socket.io-client';
import { getSocket } from '../../services/socket';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import ActionSheet from 'react-native-actionsheet';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { submitReport } from "../../../api/reportService.ts";
const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { Audio } from 'expo-av';

const getFilePart = (path: string | undefined | null) => {
  if (!path || typeof path !== 'string') {
    return '';
  }
  if (path.includes('messages_files/')) {
    return path.split('messages_files/')[1] || '';
  }
  if (path.includes('uploads/messages/')) {
    return path.split('uploads/messages/')[1] || '';
  }
  if (path.includes('/')) {
    return path.split('/').pop() || path;
  }
  if (path.includes('\\')) {
    return path.split('\\').pop() || path;
  }
  return path;
};
type Message = {
  id: string;
  chatId: string;
  messageContent: string | never;
  senderId: string;
  sentAt: string;
  deletedBySender: string;
  deletedByReceiver: string;  
  messageType: string| 'sent' | 'received' | 'system' | 'file' | 'call';
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
  readAt: Date | null;
  participantId: string;
  participant?: {
    id: string;
  };
}
type MenuOption = {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
};
type ChatProps = {
  recipientId?: string;
  recipientName?: string;
  recipientPic?: string;
};

type Offer = {
  offerAmount: string;
  offerStatus: "pending" | "accepted" | "declined";
} | null;

const truncateName = (name: string, maxLength: number = 15) => {
  if (!name) return '';
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
};

const getProfileImageUri = (imagePath: any) => {
  if (!imagePath) return undefined;
  const normalized = (imagePath + "").replace(/\\/g, "/");
  const fileName = normalized.split("profiles/")[1] || "";
  return `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${fileName}`;
};

const ChatScreen: React.FC<ChatProps> = ({
  recipientId = "1",
  recipientPic = "https://randomuser.me/api/portraits/men/1.jpg",
}): JSX.Element => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));
  const [offerAmount, setOfferAmount] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const router = useRouter();
  const {
    chatId,
    receiverName,
    chatStatus,
    jobId,
    offerStatus,
    otherParticipantId,
    profileImage,
  } = useLocalSearchParams();
  const initialOfferStatus = (offerStatus === "null" || offerStatus === "undefined" || !offerStatus) ? "none" : (offerStatus as string);
  const [currentOfferStatus, setOfferStatus] = useState(initialOfferStatus);
  const [messageInput, setMessageInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participantName, setParticipantName] = useState(receiverName || "");
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [currentChatStatus, setCurrentChatStatus] = useState(chatStatus);
  const [userType, setUserType] = useState("job-seeker");
  const [jobRequestId, setJobRequestId] = useState(jobId);
  const [currentOffer, setCurrentOffer] = useState<Offer>();
  const [visibleImageIndex, setVisibleImageIndex] = useState<number | null>(
    null
  );
  const [showOfferBanner, setShowOfferBanner] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [jobBudget, setJobBudget] = useState<string | null>(null);
  const [isBlockedByClient, setIsBlockedByClient] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const imageActionSheetRef = useRef<any>(null);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportEvidence, setReportEvidence] = useState<string | null>(null);
  const [callInfo, setCallInfo] = useState<{ calleeId: string; calleeInfo: any } | null>(null);

  const handleDeleteChat = (chatId: string) => {
    if (!socket) return;
    socket.emit("delete_chat", {
      chatId,
      userRole: "job-seeker",
    });
    router.back();
  };

  const handleOpenReportModal = () => {
    setReportReason("");
    setReportEvidence(null);
    setReportModalVisible(true);
  };

  const handlePickReportEvidence = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Str = asset.base64
          ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
          : asset.uri;
        setReportEvidence(base64Str);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick screenshot evidence");
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      Alert.alert(
        "Report not submitted",
        "Please provide a reason for the report."
      );
      return;
    }
    if (!otherParticipantId) {
      Alert.alert(
        "Report not submitted",
        "Cannot identify the user to report."
      );
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const currentUserId = await AsyncStorage.getItem("currentUserId");

      await axios.post(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/report`,
        {
          reason: reportReason,
          reportedObjectId: otherParticipantId,
          reporter: currentUserId,
          imageEvidence: reportEvidence,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "Report Submitted",
        "Thank you for your report. Our admin team will review your report and evidence promptly."
      );

      setReportModalVisible(false);
      setReportReason("");
      setReportEvidence(null);
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert(
        "Report Failed",
        "Failed to submit the report. Please try again."
      );
    }
  };

  const menuOptions: MenuOption[] = [
    {
      icon: <Ionicons name="trash" size={18} color="#777" />,
      label: "Delete conversation",
      onPress: () => handleDeleteChat(chatId as string),
    },
    {
      icon: <Ionicons name="person-remove" size={18} color="#777" />,
      label: isBlocked ? "Unblock" : "Block",
      onPress: isBlocked
        ? () => handleUnblockUser()
        : () => setBlockModalVisible(true),
    },
    {
      icon: <Ionicons name="flag" size={18} color="#777" />,
      label: "Report User",
      onPress: handleOpenReportModal,
    },
  ];
  const canDeleteForEveryone = (msg: any) => {
    if (!msg || !msg.sentAt) return false;
    const isSender = msg.senderId === currentUserId;
    const within3Minutes =
      Date.now() - new Date(msg.sentAt).getTime() <= 3 * 60 * 1000;
    return isSender && within3Minutes;
  };

  const handleLongPress = (message: any) => {
    setSelectedMessage(message);
    setActionSheetVisible(true);
    console.log("Long pressed message:", message);
  };

  const shouldHideMessage = (message: Message, currentUserId: any) => {
    const isSender = message.senderId === currentUserId;
    return isSender
      ? message.deletedBySender === "yes"
      : message.deletedByReceiver === "yes";
  };
  const handleAttachPress = () => {
    imageActionSheetRef.current?.show();
  };

  const handleOptionPress = async (index: number) => {
    if (!socket || !currentUserId) return;

    try {
      let result;
      if (index === 0) {
        // Take Photo
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.7,
          base64: true,
        });
      } else if (index === 1) {
        // Choose from Gallery
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.7,
          base64: true,
        });
      } else {
        return;
      }

      if (result && !result.canceled) {
        const image = result.assets[0];
        const base64Image = `data:${image.type || "image/jpeg"};base64,${image.base64}`;

        socket.emit("upload_image", {
          senderId: currentUserId,
          chatId: chatId,
          image: base64Image,
        });
      }
    } catch (error) {
      console.error("Error picking/taking image:", error);
      Alert.alert("Error", "Failed to access camera or gallery.");
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
        isDelivered: true,
        isSeen: msg.readBy?.some((rs) => rs && rs.readAt !== null) || false,
      }));
      const sortedMessages = messagesWithStatus.sort(
        (a: Message, b: Message) =>
          new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );

      setMessages(sortedMessages);
      return sortedMessages;
    } catch (error) {
      console.error("Error fetching initial messages:", error);
      return [];
    }
  };

  const handleSendMessage = async (
    messageContent: string,
    messageType: string
  ) => {
    console.log("hello?????????????");
    if (messageInput.trim() === "" || !socket) return;

    try {
      const newMessage = {
        chatId,
        messageContent: messageInput,
        messageType: messageType,
      };

      socket.emit("send_message", newMessage);
      console.log(messageInput);
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  const handleSystemMessage = (messageContent: string, messageType: string) => {
    if (!socket) return;

    try {
      const formattedMessage = messageContent.replace("$", "₱");

      const newMessage = {
        chatId,
        messageContent: formattedMessage,
        messageType,
      };

      socket.emit("send_message", newMessage);

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

  const handleBack = () => {
    navigation.goBack();
  };

  const toggleModal = () => {
    if (modalVisible) {
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setModalVisible(false));
    } else {
      setModalVisible(true);

      Animated.timing(modalAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const openOfferModal = () => {
    if (currentOffer?.offerAmount) {
      setOfferAmount(currentOffer.offerAmount);
    } else {
      setOfferAmount("");
    }
    setOfferModalVisible(true);
  };

  const closeOfferModal = () => {
    setOfferModalVisible(false);
  };

  const sendOffer = async () => {
    if (!offerAmount.trim() || !socket) return;
    setOfferStatus("pending");
    setCurrentOffer({
      offerAmount: offerAmount,
      offerStatus: "pending",
    });
    setOfferStatus("pending");

    socket.emit("make_offer", {
      jobRequestId,
      offerAmount: offerAmount,
      chatId,
    });
    handleSystemMessage(`Sent an offer ${offerAmount} pesos`, "system");

    setShowOfferBanner(true);

    setOfferAmount("");
    setOfferDescription("");
    setOfferModalVisible(false);
  };
  const formatTime = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const activeSocket = getSocket();

    const initSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem("currentUserId");
      if (!token) {
        console.warn("No token found, redirecting to sign-in...");
        router.push("/sign_in");
        return;
      }

      await fetchInitialMessages(token);

      if (userId) {
        console.log('Re-registering user:', userId);
        activeSocket.emit("register_user", userId);
      }

      activeSocket.off("receive_message");
      activeSocket.on("receive_message", (message: Message) => {
        setMessages((prevMessages) => {
          const isDuplicate = prevMessages.some((msg) => msg.id === message.id);
          return isDuplicate ? prevMessages : [message, ...prevMessages];
        });
      });

      setSocket(activeSocket);
    };

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

    return () => {
      activeSocket.off("receive_message");
    };
  }, [chatId, currentUserId]);

  useEffect(() => {
    if (!socket) {
      console.log("socket in receive message dont work");
      return;
    }

    socket.on("receive_message", (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;

        return [message, ...prev];
      });
    });
    socket.on("message_seen", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isSeen: true } : msg
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
    if (!socket || !currentUserId || messages.length === 0) return;

    socket.emit("mark_as_seen", { chatId });

    const unreadMessages = messages.filter(
      (message) =>
        String(message.senderId) !== String(currentUserId) &&
        (!message.readBy || message.readBy.length === 0)
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg.id);
      socket.emit("mark_as_read", { chatId, messageIds });
    }

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

    return () => {
      socket.off("messages_read");
    };
  }, [messages, currentUserId, socket]);

  useEffect(() => {
    if (!socket || !chatId) return;

    socket.emit("join_chat", { chatId });
    socket.emit("mark_as_seen", { chatId });
    return () => {
      socket.emit("leave_chat", { chatId });
    };
  }, [socket, chatId]);


  useEffect(() => {
    if (!socket) return;

    socket.on('call_initiated', ({ chatId, calleeId, calleeInfo }) => {
      console.log('Call initiated to j:', calleeInfo);
      setCallInfo({ calleeId: calleeInfo.id, calleeInfo });
    });

    return () => {
      socket.off('call_initiated');
    };
  }, [socket]);

  const renderMessageItem = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const isCurrentUser = String(item.senderId) === String(currentUserId);
    const isLastMessage = index === 0;
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

    const statusText =
      item.readBy &&
      Array.isArray(item.readBy) &&
      item.readBy.length > 0 &&
      item.readBy.some((rs) => rs && rs.readAt !== null)
        ? "Seen"
        : item.isDelivered
        ? "Delivered"
        : "";

    if (item.messageType === "system") {
      let customMessage = item.messageContent;
      const match = item.messageContent.match(/\d+/);
      const amount = match ? match[0] : "";
      if (
        item.messageContent.toLowerCase().includes("client") &&
        item.messageContent.toLowerCase().includes("declined") &&
        item.messageContent.toLowerCase().includes("chat")
      ) {
        customMessage = `${receiverName} declined your chat request`;
      } else if (
        item.messageContent.toLowerCase().includes("client") &&
        item.messageContent.toLowerCase().includes("accepted") &&
        item.messageContent.toLowerCase().includes("chat")
      ) {
        customMessage = `${receiverName} accepted your chat request`; //
      } else if (
        item.messageContent.toLocaleLowerCase().includes("offer") &&
        item.messageContent.toLocaleLowerCase().includes("accepted")
      ) {
        customMessage = `${receiverName} accepted your offer`;
      } else if (
        item.messageContent.toLocaleLowerCase().includes("offer") &&
        !item.messageContent.toLocaleLowerCase().includes("declined")
      ) {
        customMessage = `You sent an offer of ${amount} pesos`;
      } else if (
        item.messageContent.toLocaleLowerCase().includes("offer") &&
        item.messageContent.toLocaleLowerCase().includes("declined")
      ) {
        customMessage = `${receiverName} declined your offer`;
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
    const imageMessages = messages.filter((m) => {
      const isSender = m.senderId === currentUserId;

      if (isSender && m.deletedBySender === "yes") return false;
      if (!isSender && m.deletedByReceiver === "yes") return false;

      return m.messageType === "image";
    });
    const imageArray = imageMessages.map((msg) => {
      return `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/messages/${getFilePart(msg.messageContent)}`;
    });

    if (item.messageType === "image") {
      const imageUrl = `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/messages/${getFilePart(item.messageContent)}`;

      const isDeletedForEveryone =
        item.deletedBySender === "yes" && item.deletedByReceiver === "yes";

      const isVisibleToUser =
        !shouldHideMessage(item, currentUserId) || isDeletedForEveryone;

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
                  uri: getProfileImageUri(profileImage),
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
                    <Text style={styles.statusText}>{statusText}</Text>
                  )}
                  <Text style={styles.imageTime}>
                    {formatTime(item.sentAt)}
                  </Text>
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
              {visibleImageIndex !== null && imageArray[visibleImageIndex] && (
                <>
                  <Image
                    source={{ uri: imageArray[visibleImageIndex] }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setVisibleImageIndex(null)}
                  >
                    <Text style={styles.buttonText}>✕</Text>
                  </TouchableOpacity>

                  {visibleImageIndex > 0 && (
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => setVisibleImageIndex(visibleImageIndex - 1)}
                    >
                      <Text style={styles.buttonText}>‹</Text>
                    </TouchableOpacity>
                  )}

                  {visibleImageIndex < imageArray.length - 1 && (
                    <TouchableOpacity
                      style={styles.nextButton}
                      onPress={() => setVisibleImageIndex(visibleImageIndex + 1)}
                    >
                      <Text style={styles.buttonText}>›</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </Modal>
        </View>
      ) : null;
    }
    if (item.messageType === 'file') {
      const fileUrl = `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/messages/${getFilePart(item.messageContent)}`;
      const fileName = getFilePart(item.messageContent);
      const fileExtension = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
      
      const isDeletedForEveryone = item.deletedBySender === 'yes' && item.deletedByReceiver === 'yes';
      const isVisibleToUser = !shouldHideMessage(item, currentUserId) || isDeletedForEveryone;

      // Get file icon based on extension
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
                  uri: getProfileImageUri(profileImage) 
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
                  <View style={styles.fileIconContainer}>
                    {getFileIcon()}
                  </View>
                  <View style={styles.fileInfoContainer}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {fileName}
                    </Text>
                    <Text style={styles.fileExtension}>
                      {fileExtension?.toUpperCase()}
                    </Text>
                  </View>
                  {showStatus && (
                    <Text style={styles.statusText}>
                      {statusText}
                    </Text>
                  )}
                  <Text style={styles.fileTime}>{formatTime(item.sentAt)}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null;
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
                  uri: getProfileImageUri(profileImage),
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
              <View style={[styles.callIconContainer, !isCurrentUser && styles.receivedCallIconContainer]}>
                <Ionicons 
                  name={
                    item.messageContent.toLowerCase().includes('rejected') || 
                    item.messageContent.toLowerCase().includes('voice') 
                      ? "call" 
                      : "videocam"
                  }
                  size={18} 
                  color={isCurrentUser ? "#FFF" : "#0F172A"} 
                />
              </View>
              <View style={styles.callMessageInfo}>
                <Text style={styles.callMessageText}>
                  {item.messageContent.toLowerCase().includes('video') ? 'Video Call' : 'Voice Call'}
                </Text>
                <Text style={styles.callMessageSubtext}>
                  {item.messageContent.includes('\n') 
                    ? item.messageContent.split('\n')[1].trim() 
                    : item.messageContent}
                </Text>
              </View>
            </View>
          </View>
          {showStatus && <Text style={styles.statusText}>{statusText}</Text>}
        </View>
      ) : null;
    }

    if (isCurrentUser) item.messageType = "sent";
    else if (!isCurrentUser) item.messageType = "received";

    const isDeletedForEveryone =
      item.deletedBySender === "yes" && item.deletedByReceiver === "yes";

    const isVisibleToUser =
      !shouldHideMessage(item, currentUserId) || isDeletedForEveryone;

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
            item.messageType === "sent" ? styles.sentMessageRow : styles.receivedMessageRow,
          ]}
        >
          {item.messageType === "received" && recipientPic && (
            <Image
              source={{
                uri: getProfileImageUri(profileImage),
              }}
              style={styles.senderAvatar}
              defaultSource={require("assets/images/client-user.png")}
            />
          )}

          <View
            style={[
              styles.messageBubble,
              item.messageType === "sent" ? styles.sentBubble : styles.receivedBubble,
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
                    ? "You removed a message"
                    : `${receiverName ?? "Someone"} removed a message`}
                </Text>
              ) : (
                <>
                  <Text
                    style={[
                      styles.messageText,
                      item.messageType === "sent"
                        ? styles.sentMessageText
                        : styles.receivedMessageText,
                    ]}
                  >
                    {item.messageContent}
                  </Text>

                  <Text
                    style={[
                      styles.messageTime,
                      item.messageType === "sent"
                        ? styles.sentMessageTime
                        : styles.receivedMessageTime,
                    ]}
                  >
                    {formatTime(item.sentAt)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {showStatus && <Text style={styles.statusText}>{statusText}</Text>}
      </View>
    ) : null;
  };

  const modalScale = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const modalOpacity = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const renderEmptyChat = () => (
    <View style={[styles.emptyContainer, { marginTop: 20 }]}>
      <Text style={styles.emptyTitle}>Start Your Conversation</Text>
      <Text style={styles.emptyText}>
        Introduce yourself and discuss the job details with {receiverName}.
      </Text>
      <Text style={styles.emptySubtext}>
        Be professional and clear about your skills and experience related to
        this job.
      </Text>
    </View>
  );

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
      Alert.alert("Success", "User has been unblocked");
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", "Failed to unblock user. Please try again.");
    }
  };

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

  const fetchJobBudget = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/job/${jobRequestId}/budget`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.budget) {
        setJobBudget(response.data.budget);
      }
    } catch (error) {
      console.error("Error fetching job budget:", error);
    }
  };

  useEffect(() => {
    if (jobRequestId) {
      fetchJobBudget();
    }
  }, [jobRequestId]);

  const checkIfBlockedByClient = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/users/${currentUserId}/blocked-by`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const isBlocked = response.data.includes(otherParticipantId);
      setIsBlockedByClient(isBlocked);
    } catch (error) {
      console.error("Error checking if blocked by client:", error);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      checkIfBlockedByClient();
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

  useEffect(() => {
    if (!socket) return;

    socket.on('file_upload_response', (response) => {
      console.log('File upload response:', response);
      if (response.error) {
        Alert.alert('Upload Error', response.error);
      } else {
        Alert.alert('Success', 'File uploaded successfully');
      }
    });

    return () => {
      socket.off('file_upload_response');
    };
  }, [socket]);

  const handleVoiceCall = () => {
    if (!socket) return;
    socket.emit('initiate_call', { 
      chatId, 
      callerId: currentUserId,
      calleeId: otherParticipantId ,
      callType: 'voice'
    });
    router.push({
      pathname: "/screen/job-seeker-screen/agora-call-room",
      params: {
        callType: 'voice',
        receiverName: receiverName,
        receiverImage: profileImage,
        chatId: chatId,
        isCaller: "true",
        callerId: currentUserId,
        calleeId:otherParticipantId
      }
    });
  };

  const handleVideoCall = () => {
    if (!socket) return;
    socket.emit('initiate_call', { 
      chatId, 
      callerId: currentUserId,
      calleeId: otherParticipantId ,
      callType: 'video'
    });
    router.push({
      pathname: "/screen/job-seeker-screen/agora-call-room",
      params: {
        callType: 'video',
        receiverName: receiverName,
        receiverImage: profileImage,
        chatId: chatId,
        isCaller: "true",
        callerId: currentUserId,
        calleeId:otherParticipantId
      }
    });
  };



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View
        style={[
          styles.header,
          Platform.OS === "ios" && styles.iosHeader,
          Platform.OS === "android" && styles.androidHeader,
        ]}
      >
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerUserInfo}>
          <TouchableOpacity
            onPress={() =>
              safePush("../../../screen/profile/view-profile/view-page-client", { otherParticipantId })
            }
            style={styles.profileTouchable}
          >
            <Image
              source={{
                uri: getProfileImageUri(profileImage),
              }}
              style={styles.recipientAvatar}
            />
            <Text style={styles.recipientName} numberOfLines={1}>
              {truncateName(receiverName as string)}
            </Text>
          </TouchableOpacity>
        </View>

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

          <TouchableOpacity onPress={toggleModal} style={styles.headerIconButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {currentOffer && currentOfferStatus == "pending" && showOfferBanner && (
        <View style={styles.offerNoticeBanner}>
          <Ionicons name="cash" size={16} color="#fff" />
          <Text style={styles.offerNoticeText}>
            You've sent an offer of ₱{currentOffer.offerAmount}
          </Text>
        </View>
      )}

      {(currentOfferStatus === "none" || currentOfferStatus === "declined") &&
        currentChatStatus === "approved" && (
          <TouchableOpacity
            style={styles.makeOfferButton}
            onPress={openOfferModal}
          >
            <Text style={{ fontSize: 16, color: "#0b216f" }}>₱</Text>
            <Text style={styles.makeOfferText}>Make Offer</Text>
          </TouchableOpacity>
        )}

      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        onRequestClose={toggleModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={toggleModal}
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
                  toggleModal();
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
        transparent
        visible={offerModalVisible}
        animationType="fade"
        onRequestClose={closeOfferModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.offerModalContainer}>
            <View style={styles.offerModalHeader}>
              <Text style={styles.offerModalTitle}>Make an Offer</Text>
              <TouchableOpacity onPress={closeOfferModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.offerModalContent}>
              <Text style={styles.offerLabel}>Amount (₱)</Text>
              <TextInput
                style={styles.offerAmountInput}
                value={offerAmount}
                onChangeText={setOfferAmount}
                keyboardType="numeric"
                placeholder={jobBudget ? `${jobBudget}` : "Enter amount"}
              />

              <TouchableOpacity
                style={[
                  styles.sendOfferButton,
                  !offerAmount.trim() && styles.sendOfferButtonDisabled,
                ]}
                onPress={sendOffer}
                disabled={!offerAmount.trim()}
              >
                <Text style={styles.sendOfferButtonText}>Send Offer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={renderEmptyChat}
        inverted={messages.length > 0}
      />

      {isBlocked || isBlockedByClient ? (
        <View style={styles.blockedContainer}>
          <Ionicons name="person-remove" size={50} color="#ff3b30" />
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
      ) : currentChatStatus === "rejected" ? (
        <View style={styles.rejectedContainer}>
          <Ionicons name="close-circle" size={50} color="#ff3b30" />
          <Text style={styles.rejectedText}>This chat has been rejected</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          style={styles.inputContainer}
        >
          <ActionSheet
            ref={imageActionSheetRef}
            title={"Attach Image"}
            options={["Take Photo", "Choose from Gallery", "Cancel"]}
            cancelButtonIndex={2}
            onPress={handleOptionPress}
          />

          <View style={styles.inputIconsContainer}>
            <TouchableOpacity style={styles.iconButton} onPress={handleAttachPress}>
              <Ionicons name="image" size={24} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleFilePress}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <Ionicons name="attach" size={24} color="#999" />
              )}
            </TouchableOpacity>
          </View>
          

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
            onPress={() => handleSendMessage(messageInput, "text")}
            disabled={messageInput.trim().length === 0}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
                <Text style={styles.blockButtonText}>Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Report User Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => {
          setReportModalVisible(false);
          setReportEvidence(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.blockModalContainer, { padding: 20 }]}>
            <Text style={styles.blockModalTitle}>Report User</Text>
            <TextInput
              style={styles.blockReasonInput}
              placeholder="Please provide a clear reason for reporting..."
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />

            <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginTop: 10, alignSelf: "flex-start" }}>
              Screenshot / Image Evidence (Recommended)
            </Text>

            {reportEvidence ? (
              <View style={{ marginTop: 8, position: "relative", width: "100%", alignItems: "center" }}>
                <Image source={{ uri: reportEvidence }} style={{ width: "100%", height: 140, borderRadius: 8, resizeMode: "cover" }} />
                <TouchableOpacity
                  style={{ position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 4 }}
                  onPress={() => setReportEvidence(null)}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  paddingVertical: 12,
                  marginTop: 8,
                  borderWidth: 1.5,
                  borderColor: "#CBD5E1",
                  borderStyle: "dashed",
                  borderRadius: 8,
                  backgroundColor: "#F8FAFC",
                }}
                onPress={handlePickReportEvidence}
              >
                <Ionicons name="camera" size={20} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={{ color: "#0284C7", fontWeight: "600", fontSize: 14 }}>
                  Attach Screenshot Evidence
                </Text>
              </TouchableOpacity>
            )}

            <View style={[styles.blockModalButtons, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setReportModalVisible(false);
                  setReportEvidence(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.blockButton, { backgroundColor: "#EF4444" }]}
                onPress={handleReportSubmit}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Submit Report</Text>
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
    paddingTop: 20,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
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
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 4,
  },
  moreButton: {
    padding: 8,
  },
  offerNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b216f",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  offerNoticeText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 8,
    flexShrink: 1,
  },
  makeOfferButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  makeOfferText: {
    marginLeft: 5,
    color: "#0b216f",
    fontWeight: "500",
    fontSize: 15,
  },
  messageList: {
    padding: 10,
    flexGrow: 1,
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
  inputIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 4,
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

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#f2f2f7",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0b216f",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  offerModalContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_WIDTH * 1.1,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  offerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  offerModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  offerModalContent: {
    padding: 15,
    maxHeight: 400,
  },
  offerLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
    marginTop: 10,
  },
  offerAmountInput: {
    backgroundColor: "#f2f2f7",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  offerDescriptionInput: {
    backgroundColor: "#f2f2f7",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    height: 100,
    textAlignVertical: "top",
  },
  sendOfferButton: {
    backgroundColor: "#0b216f",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  sendOfferButtonDisabled: {
    backgroundColor: "#b0c0e0",
  },
  sendOfferButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
    backgroundColor: "#f0f0f0",
    overflow: "hidden",
    marginRight: 3,
  },
  imageMessage: {
    width: 250,
    height: 150,
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
  deletedMessageTime: {
    opacity: 0.6,
  },
  deletedImagePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    color: "#555",
    alignSelf: "flex-end",
    marginTop: -15,
    marginRight: 5,
  },
  profileTouchable: {
    flexDirection: "row",
    alignItems: "center",
  },
  blockModalContainer: {
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
  blockModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#ff3b30",
  },
  blockModalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  blockReasonInput: {
    width: "100%",
    height: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  blockModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: "#f2f2f7",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  blockButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
  },
  blockButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  blockedContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  blockedText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  unblockButton: {
    backgroundColor: "#0b216f",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  unblockButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  budgetInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    fontStyle: "italic",
  },
  rejectedContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectedText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
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
  incomingCallContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  incomingCallCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  incomingCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  incomingCallAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  incomingCallInfo: {
    flex: 1,
  },
  incomingCallName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  incomingCallType: {
    fontSize: 14,
    color: '#666',
  },
  incomingCallActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  callButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  rejectIcon: {
    transform: [{ rotate: '135deg' }],
  },
  callMessageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    maxWidth: '75%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  sentCallBubble: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    marginRight: 8,
  },
  receivedCallBubble: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  callIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0B153C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  receivedCallIconContainer: {
    backgroundColor: '#E2E8F0',
  },
  callMessageInfo: {
    flex: 1,
  },
  callMessageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  callMessageSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});

export default ChatScreen;





























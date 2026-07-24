import React, { useState,useEffect,useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  TextInput,
  TouchableWithoutFeedback,
  StatusBar,
  Image,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter,useLocalSearchParams,useGlobalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io,{Socket} from 'socket.io-client';
import { useFocusEffect } from '@react-navigation/native';


interface Chat {
  id: string;
  createdAt:string;
  participantName: string;
  profileImage: string | 'https://randomuser.me/api/portraits/men/1.jpg';
  lastMessage: string | null;
  lastMessageTime: string | null;
  chatTitle: string;
  chatStatus: string;
  jobId: string;
  offer: string | '0';
  offerStatus:string | 'none';
  senderId:string;
  otherParticipantId:string;
  deletedBySender:string;
  deletedByReceiver:string;
}

const ChatScreen: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [chatOptionsModalVisible, setChatOptionsModalVisible] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUserId,setCurrentUserId] = useState<string>('');
  const [filteredSearchedChats, setFilteredSearchedChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [navigatingChatId, setNavigatingChatId] = useState<string | null>(null);
  

  const handleDeleteChat = (chatId: string) => {
    if(!socket) return;
    socket.emit('delete_chat', {
      chatId,
      userRole: 'client',
    });
    socket.emit('fetch_user_chats');
    setChatOptionsModalVisible(false);
  };

  
  const handleSearch = (query: string) => {
    const lowerQuery = query.toLowerCase();
  
    const filtered = chats.filter(chat => {
      const titleMatch = chat.chatTitle?.toLowerCase().includes(lowerQuery);
      const nameMatch = chat.participantName?.toLowerCase().includes(lowerQuery);
      return titleMatch || nameMatch;
    });
  
    setFilteredSearchedChats(filtered);
  };
  
  const updateOffer = (newOffer: string, newStatus: string) => {
    setChats(prev => ({
      ...prev,
      offer: newOffer,
      offerStatus: newStatus
    }));
  };
  const fetchChats = async (socketInstance?: Socket) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userId = await AsyncStorage.getItem('currentUserId');
      setCurrentUserId(userId+'');
      if (!token) {
        router.replace("/sign_in");
        return;
      }

      const currentSocket = socketInstance || socket;
      if (currentSocket) {
        currentSocket.emit('fetch_user_chats');
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const handleChatPress = async (chatId: string, participantName: string, chatStatus: string, jobId: string, offer: string, offerStatus: string, otherParticipantId: string, profileImage: string) => {
    try {
      setNavigatingChatId(chatId);
      await router.push({
        pathname: "../../../screen/client-screen/client-message-screen",
        params: { chatId, receiverName: participantName, chatStatus, jobId, offer, offerStatus, otherParticipantId, profileImage },
      });
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setNavigatingChatId(null);
    }
  };

  const formatTime = (dateString: string | number | Date) => {

    const date = new Date(dateString);
    const now = new Date();
    if (isNaN(date.getTime())) return '';
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    if (diffInDays < 7 && date.getDay() !== now.getDay()) {
        return date.toLocaleDateString([], { weekday: 'long' });
    }

    return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

  const filteredChats = chats.filter(msg => {
    if (selectedFilter === 'All') return true;
    return msg.chatStatus === selectedFilter;
  });


  useEffect(() => {

    const initializeSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          router.replace("/sign_in");
          return;
        }

        const newSocket = io(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000`, {
          auth: { token }
        });
        // newSocket.onAny((event, ...args) => {
        //   console.log(`📡 Socket event: ${event}`, args);
        // });
        if (currentUserId) {
          newSocket.emit("register_user", currentUserId);
        }
        newSocket.on("new_chat", (data) => {
          setChats(prev => {
            return [data, ...prev];
          });
        });
        newSocket.on('connect', () => {
          fetchChats(newSocket);
        });

        newSocket.on('user_chats_fetched', (fetchedChats: Chat[]) => {
          setChats(
            fetchedChats.sort((a, b) => {
              const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : new Date(a.createdAt).getTime();
              const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : new Date(b.createdAt).getTime();
              return bTime - aTime;
            })
          );
          setLoading(false);
          setRefreshing(false);
        });


        newSocket.on("chat_updated", (updatedChat: Chat) => {
          setChats((prevChats) => {
            const existingChatIndex = prevChats.findIndex((chat) => chat.id === updatedChat.id);
            let updatedChats;

            if (existingChatIndex !== -1) {
              updatedChats = [...prevChats];
              updatedChats[existingChatIndex] = {
                ...updatedChats[existingChatIndex],
                lastMessage: updatedChat.lastMessage,
                lastMessageTime: updatedChat.lastMessageTime
              };
            } else {
              updatedChats = [updatedChat, ...prevChats];
            }

            return updatedChats.sort((a, b) => {
              const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : new Date(a.createdAt).getTime();
              const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : new Date(b.createdAt).getTime();
              return bTime - aTime;
            });
          });
        });
        newSocket.on('user_chats_error', (error) => {
          console.error('Chats fetch error:', error);
          setLoading(false);
          setRefreshing(false);
        });

        setSocket(newSocket);

        return () => {
          newSocket.disconnect();
        };
      } catch (error) {
        console.error("Error initializing socket:", error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    initializeSocket();

  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!socket) return;
  
      console.log("🔄 Screen refocused - fetching chats again");
      socket.emit('fetch_user_chats');
  
      const handleFetchedChats = (fetchedChats: Chat[]) => {
        setChats(
          fetchedChats.sort((a, b) => {
            const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : new Date(a.createdAt).getTime();
            const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : new Date(b.createdAt).getTime();
            return bTime - aTime;
          })
        );
        setLoading(false);
        setRefreshing(false);
      };
  
      socket.on('user_chats_fetched', handleFetchedChats);
  
      return () => {
        socket.off('user_chats_fetched', handleFetchedChats);
      };
    }, [socket])
  );
  


  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={[
        styles.ChatContainer,
        navigatingChatId === item.id && styles.disabledChat
      ]}
      onLongPress={() => {
        if (navigatingChatId === item.id) return;
        setSelectedChat(item);
        setChatOptionsModalVisible(true);
      }}
      onPress={() => {
        if (navigatingChatId === item.id) return;
        handleChatPress(
          item.id, 
          item.participantName, 
          item.chatStatus,
          item.jobId,
          item.offer,
          item.offerStatus,
          item.otherParticipantId,
          item.profileImage
        );
      }}
      disabled={navigatingChatId === item.id}
    >
      {item.profileImage ? (
        <Image 
          source={{ 
            uri: item.profileImage 
              ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${
                  item.profileImage.split("profiles/")[1] || ''
                }`
              : undefined 
          }}
          style={styles.avatarPlaceholder}
          defaultSource={require('assets/images/client-user.png')}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={24} color="#999" />
        </View>
      )}
      <View style={styles.ChatContent}>
        <Text style={styles.ChatName}>{item.participantName}</Text>
        <Text>{item.chatTitle}</Text>
        <Text 
          style={styles.ChatPreview} 
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.deletedBySender === 'yes' && item.deletedByReceiver === 'yes' ? (
            currentUserId === item.senderId
              ? 'You removed a message'
              : `${item.participantName} removed a message`
          ) : item.lastMessage && item.lastMessage.includes('assets/messages_files/') ? (
            currentUserId === item.senderId 
              ? 'You sent an attachment' 
              : `${item.participantName} sent an attachment`
          ) : (
            item.lastMessage ?? 'No messages yet'
          )}
        </Text>
        <Text style={styles.ChatDate}>{formatTime(item.lastMessageTime+'') || formatTime(item.createdAt)}</Text>
      </View>
      {navigatingChatId === item.id ? (
        <ActivityIndicator size="small" color="#0b216f" style={styles.navigationLoading} />
      ) : (
        <>
          {item.chatStatus === 'approved' && <View style={[styles.statusIndicator, styles.activeStatus]} />}
          {item.chatStatus === 'pending' && <View style={[styles.statusIndicator, styles.pendingStatus]} />}
          {item.chatStatus === 'rejected' && <View style={[styles.statusIndicator, styles.rejectedStatus]} />}
        </>
      )}
    </TouchableOpacity>
  );

  const renderChatOptions = () => {
    if (!selectedChat) return null;
  
    return (
      <View style={styles.messengerModalContent}>
        <TouchableOpacity style={styles.modalOption}>
          <View style={styles.modalOptionIcon}>
            <Text style={styles.modalOptionIconText}>🔇</Text>
          </View>
          <Text style={styles.modalOptionText}>Mute</Text>
        </TouchableOpacity>
  
        <TouchableOpacity
          style={[styles.modalOption, styles.deleteOption]}
          onPress={() =>
            handleDeleteChat(selectedChat.id)
          }
        >
          <View style={styles.modalOptionIcon}>
            <Text style={styles.modalOptionIconText}>🗑️</Text>
          </View>
          <Text style={[styles.modalOptionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };
  

  const renderFilterModal = () => (
    <View style={styles.messengerModalContent}>
      <TouchableOpacity 
        style={styles.modalOption}
        onPress={() => {
          setSelectedFilter('All');
          setFilterModalVisible(false);
        }}
      >
        <View style={styles.modalOptionIcon}>
          <Text style={styles.modalOptionIconText}>📬</Text>
        </View>
        <Text style={styles.modalOptionText}>All Chats</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.modalOption}
        onPress={() => {
          setSelectedFilter('approved');
          setFilterModalVisible(false);
        }}
      >
        <View style={styles.modalOptionIcon}>
          <Text style={styles.modalOptionIconText}>✅</Text>
        </View>
        <Text style={styles.modalOptionText}>Active Chats</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.modalOption}
        onPress={() => {
          setSelectedFilter('pending');
          setFilterModalVisible(false);
        }}
      >
        <View style={styles.modalOptionIcon}>
          <Text style={styles.modalOptionIconText}>⏳</Text>
        </View>
        <Text style={styles.modalOptionText}>Pending Chats</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.modalOption}
        onPress={() => {
          setSelectedFilter('rejected');
          setFilterModalVisible(false);
        }}
      >
        <View style={styles.modalOptionIcon}>
          <Text style={styles.modalOptionIconText}>❌</Text>
        </View>
        <Text style={styles.modalOptionText}>Rejected Chats</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, Platform.OS === 'ios' && styles.iosHeader]}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity 
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />

          <TextInput 
            placeholder="Search Chats" 
            style={styles.searchInput} 
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                handleSearch('');
              }}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>


        <FlatList
        data={searchQuery ? filteredSearchedChats : filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No chats available</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />


      <Modal
        transparent={true}
        visible={chatOptionsModalVisible}
        animationType="slide"
        onRequestClose={() => setChatOptionsModalVisible(false)}
        
      >
        <TouchableWithoutFeedback onPress={() => setChatOptionsModalVisible(false)}>
          <View style={styles.modalBackground}>
            <TouchableWithoutFeedback>
              {renderChatOptions()}
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        transparent={true}
        visible={filterModalVisible}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalBackground}>
            <TouchableWithoutFeedback>
              {renderFilterModal()}
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingTop: Platform.OS === 'android' ? 50 : 10,
  },
  iosHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: "#0b216f",
  },
  searchContainer: {
    padding: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    position: 'relative',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
  },
  ChatContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ChatContent: {
    flex: 1,
  },
  ChatName: {
    fontWeight: 'bold',
  },
  ChatPreview: {
    color: '#666',
    marginVertical: 5,
  },
  ChatDate: {
    color: '#999',
    fontSize: 12,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeStatus: {
    backgroundColor: '#2ecc71', // Bright green
  },
  pendingStatus: {
    backgroundColor: '#f39c12', // Bright orange
  },
  rejectedStatus: {
    backgroundColor: '#e74c3c', // Bright red
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  messengerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  modalOptionIcon: {
    marginRight: 15,
    width: 30,
    alignItems: 'center',
  },
  modalOptionIconText: {
    fontSize: 20,
  },
  modalOptionText: {
    fontSize: 16,
  },
  deleteOption: {},
  deleteText: {
    color: 'red',
  },
  emptyText:{
    textAlign:"center",
    marginTop:20,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  clearButtonText: {
    color: '#999',
  },
  disabledChat: {
    opacity: 0.7,
  },
  navigationLoading: {
    marginLeft: 8,
  },
});

export default ChatScreen;
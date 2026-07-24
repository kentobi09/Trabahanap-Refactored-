import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Share,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  AddCommunityPost,
  fetchCommunityPosts,
  likePost,
  unlikePost,
  checkIfLiked,
  addComment,
  fetchPostComments,
  deleteCommunityPost,
  editCommunityPost,
  editCommunityCommentOrReply,
  deleteCommunityCommentOrReply,
  likeCommentOrReply,
  unlikeCommentOrReply,
  checkCommentLiked,
} from "@/api/community-request";
import decodeToken from "@/api/token-decoder";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Simplified types
type Comment = {
  id: string;
  username: string;
  avatar: string | null;
  text: string;
  time: string;
  replies?: Comment[];
  isUpvoted?: boolean;
  userId?: string;
  likeCount?: number;
};

type Post = {
  id: string;
  clientId?: string;
  jobSeekerId?: string;
  postContent: string;
  postImage: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  username: string;
  profileImage?: string;
  isUpvoted?: boolean;
  upvotes?: number;
  comments?: number;
  commentsList?: Comment[];
};

type AddCommentMutation = {
  postId: string;
  comment: {
    comment: string;
    userId: string;
    userType: string;
    parentCommentId?: string | null;
  };
};

type Styles = {
  container: ViewStyle;
  androidContainer: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  createPostTrigger: ViewStyle;
  createPostPlaceholder: ViewStyle;
  createPostText: TextStyle;
  userAvatar: ImageStyle;
  postButton: ViewStyle;
  disabledButton: ViewStyle;
  postButtonText: TextStyle;
  feedContainer: ViewStyle;
  postContainer: ViewStyle;
  postHeader: ViewStyle;
  postHeaderContent: ViewStyle;
  postActions: ViewStyle;
  postActionButton: ViewStyle;
  avatar: ImageStyle;
  smallAvatar: ImageStyle;
  username: TextStyle;
  jobTitle: TextStyle;
  time: TextStyle;
  content: TextStyle;
  postImage: ImageStyle;
  stats: ViewStyle;
  statsText: TextStyle;
  actions: ViewStyle;
  actionButton: ViewStyle;
  actionText: TextStyle;
  activeActionText: TextStyle;
  commentSection: ViewStyle;
  addCommentContainer: ViewStyle;
  commentInput: TextStyle;
  sendButton: ViewStyle;
  commentContainer: ViewStyle;
  replyContainer: ViewStyle;
  commentAvatar: ImageStyle;
  commentContent: ViewStyle;
  commentBubble: ViewStyle;
  commentHeader: ViewStyle;
  commentActionButton: ViewStyle;
  commentUsername: TextStyle;
  commentText: TextStyle;
  commentActions: ViewStyle;
  commentTime: TextStyle;
  commentAction: TextStyle;
  repliesContainer: ViewStyle;
  replyLikeButton: ViewStyle;
  replyLikeText: TextStyle;
  replyLikeTextActive: TextStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  modalContent: ViewStyle;
  userInfoContainer: ViewStyle;
  postInputFull: TextStyle;
  selectedImageContainer: ViewStyle;
  selectedImage: ImageStyle;
  removeImageButton: ViewStyle;
  postOptions: ViewStyle;
  addToYourPost: TextStyle;
  postOptionsButtons: ViewStyle;
  optionButton: ViewStyle;
  commentsScrollView: ViewStyle;
  originalPostReference: ViewStyle;
  originalPostContent: TextStyle;
  commentInputSection: ViewStyle;
  replyingToContainer: ViewStyle;
  replyingToText: TextStyle;
  loadingContainer: ViewStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  noPostsContainer: ViewStyle;
  noPostsText: TextStyle;
  noCommentsContainer: ViewStyle;
  noCommentsText: TextStyle;
  successModalOverlay: ViewStyle;
  successModalContainer: ViewStyle;
  successModalText: TextStyle;
  modalContainer: ViewStyle;
  modalScrollView: ViewStyle;
  editingCommentInput: TextStyle;
  commentActionGroup: ViewStyle;
};

const SocialFeedScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newPostText, setNewPostText] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(
    null
  );
  const [commentModalVisible, setCommentModalVisible] =
    useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingPostDetails, setEditingPostDetails] = useState<Post | null>(
    null
  );
  const [editedContentText, setEditedContentText] = useState<string>("");
  const [editedImageDisplayUri, setEditedImageDisplayUri] = useState<
    string | null
  >(null);
  const [newLocalImageForEditUri, setNewLocalImageForEditUri] = useState<
    string | null
  >(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentTextForComment, setEditingCommentTextForComment] =
    useState<string>("");

  // State to track which comments are liked by the current user
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    new Set()
  );

  // State to track explicitly unliked comments - this will override any other state
  const [explicitlyUnlikedCommentIds, setExplicitlyUnlikedCommentIds] =
    useState<Set<string>>(new Set());

  // Track last toggle time to prevent too rapid toggling
  const [lastToggleTime, setLastToggleTime] = useState<Record<string, number>>(
    {}
  );

  const {
    data: fetchedPosts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Post[]>({
    queryKey: ["community-posts"],
    queryFn: fetchCommunityPosts,
  });

  const {
    data: comments,
    isLoading: commentsLoading,
    error: commentsError,
    refetch: refetchComments
  } = useQuery({
    queryKey: ["post-comments", selectedPost?.id],
    queryFn: async () => {
      if (!selectedPost) return [];
      const comments = await fetchPostComments(selectedPost.id);
      
      // Log to verify the server response has like counts
      console.log("Job Seeker - Server response for comments:", 
        comments.map((c: any) => ({ 
          id: c.id, 
          likeCount: c.likeCount || 0, 
          isUpvoted: !!c.isUpvoted,
          username: c.username
        }))
      );
      
      // Make sure we preserve the server-provided like counts
      return comments.map((comment: any) => ({
        ...comment,
        likeCount: comment.likeCount || 0,  // Ensure we have a likeCount
        isUpvoted: !!comment.isUpvoted      // Convert to boolean
      }));
    },
    staleTime: Infinity, // Managed by mutations and manual refetching
    enabled: !!selectedPost,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, comment }: AddCommentMutation) => {
      return await addComment(postId, comment);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });

  const editPostMutation = useMutation({
    mutationFn: async (data: { postId: string; updatedData: any }) => {
      return editCommunityPost(data.postId, data.updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setIsEditModalVisible(false);
      setEditingPostDetails(null);
      setNewLocalImageForEditUri(null);
      setEditedImageDisplayUri(null);
      Alert.alert("Success", "Post updated successfully.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to update post.");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: deleteCommunityPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      Alert.alert("Success", "Post deleted successfully.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to delete post.");
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async (data: {
      postId: string;
      commentId: string;
      newText: string;
    }) => {
      return editCommunityCommentOrReply(
        data.postId,
        data.commentId,
        data.newText
      );
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["post-comments", variables.postId],
      });
      setEditingCommentId(null);
      Alert.alert("Success", "Comment updated.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to update comment.");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (data: { postId: string; commentId: string }) => {
      return deleteCommunityCommentOrReply(data.postId, data.commentId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["post-comments", variables.postId],
      });
      Alert.alert("Success", "Comment deleted.");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to delete comment.");
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (data: { postId: string; commentId: string }) => {
      return likeCommentOrReply(data.postId, data.commentId);
    },
    onSuccess: (data, variables) => {
      // Update our local tracking of liked comments
      setLikedCommentIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(variables.commentId);
        return newSet;
      });

      // Remove from explicitly unliked set
      setExplicitlyUnlikedCommentIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(variables.commentId);
        return newSet;
      });

      // Update the cache to reflect this like
      queryClient.setQueryData(
        ["post-comments", variables.postId],
        (oldData: Comment[] | undefined) => {
          if (!oldData) return [];
          return oldData.map((comment) =>
            updateCommentLikeStatus(comment, variables.commentId, true)
          );
        }
      );

      // Optional: Update community posts for other screens
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (error: any) => {
      console.error("Error liking comment:", error.message);
      // Even on error, keep the UI consistent with what the user expects
      // This ensures the UI doesn't flicker back to the previous state
    },
  });

  const unlikeCommentMutation = useMutation({
    mutationFn: async (data: { postId: string; commentId: string }) => {
      return unlikeCommentOrReply(data.postId, data.commentId);
    },
    onSuccess: (data, variables) => {
      // Update our local tracking of liked comments
      setLikedCommentIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(variables.commentId);
        return newSet;
      });

      // Add to explicitly unliked set
      setExplicitlyUnlikedCommentIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(variables.commentId);
        return newSet;
      });

      // Update the cache to reflect this unlike
      queryClient.setQueryData(
        ["post-comments", variables.postId],
        (oldData: Comment[] | undefined) => {
          if (!oldData) return [];
          return oldData.map((comment) =>
            updateCommentLikeStatus(comment, variables.commentId, false)
          );
        }
      );

      // Optional: Update community posts for other screens
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (error: any) => {
      console.error("Error unliking comment:", error.message);
      // Even on error, update the UI as if it succeeded
      // This ensures better UX by keeping the UI consistent with what the user expects
    },
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data } = await decodeToken();
        const profileImagePath = data.profileImage;
        const userName = `${data.firstName} ${data.middleName[0]}. ${data.lastName}`;

        if (profileImagePath) {
          setUserProfileImage(
            `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${profileImagePath}`
          );
        }
        setUsername(userName);
        setData(data);
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (fetchedPosts.length > 0) {
      const loadPostLikes = async () => {
        const updatedPosts = await Promise.all(
          fetchedPosts.map(async (post) => {
            try {
              const likeStatus = await checkIfLiked(post.id);
              return {
                ...post,
                isUpvoted: !!likeStatus.likedAt,
                upvotes: post.likeCount || 0,
              };
            } catch (error) {
              console.error(
                "Error checking like status for post:",
                post.id,
                error
              );
              return {
                ...post,
                isUpvoted: false,
                upvotes: post.likeCount || 0,
              };
            }
          })
        );
        setPosts(updatedPosts);
      };
      loadPostLikes();
    }
  }, [fetchedPosts]);

  const navigateToSearch = () => {
    router.push("./");
  };

  const onRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };

  const getUsername = async () => {
    const { data } = await decodeToken();
    const userName = `${data.firstName} ${data.middleName[0]}. ${data.lastName}`;
    return userName;
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image");
    }
  };

  const handleAddPost = async () => {
    if (newPostText.trim() === "" && !selectedImage) return;

    const newPost: Post = {
      id: Date.now().toString(),
      username: await getUsername(),
      postContent: newPostText,
      postImage: selectedImage || "",
      likeCount: 0,
      commentCount: 0,
      createdAt: Date.now().toString(),
    };

    try {
      await AddCommunityPost(newPost);
      refetch();
      setNewPostText("");
      setSelectedImage(null);
      setShowCreatePost(false);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      Alert.alert("Error", "Failed to create post");
    }
  };

  const handleShare = async (post: Post) => {
    try {
      const postUrl = `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/community/posts/${post.id}`;
      const message = `Check out this post from ${post.username}:\n\n${post.postContent}\n\n${postUrl}`;

      const result = await Share.share({
        message,
        title: "Share Post",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share post");
    }
  };

  const toggleUpvote = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // First update the UI optimistically
      const updatedPosts = posts.map((p) => {
        if (p.id === postId) {
          const currentLikeCount = p.likeCount || 0;
          const newIsUpvoted = !p.isUpvoted;
          return {
            ...p,
            isUpvoted: newIsUpvoted,
            likeCount: newIsUpvoted
              ? currentLikeCount + 1
              : Math.max(0, currentLikeCount - 1),
            upvotes: newIsUpvoted
              ? currentLikeCount + 1
              : Math.max(0, currentLikeCount - 1),
          };
        }
        return p;
      });
      setPosts(updatedPosts);

      // Then make the API call
      if (post.isUpvoted) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }

      // Refresh the posts to ensure consistency
      refetch();
    } catch (error) {
      console.error("Error toggling upvote:", error);
      // Revert the UI change on error
      const revertedPosts = posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            isUpvoted: p.isUpvoted,
            likeCount: p.likeCount,
            upvotes: p.likeCount,
          };
        }
        return p;
      });
      setPosts(revertedPosts);
      Alert.alert("Error", "Failed to update like status");
    }
  };

  // Helper function to check if a comment is liked (using local state)
  const hasCommentLike = (commentId: string): boolean => {
    // If it's in the explicitly unliked set, it's definitely not liked
    if (explicitlyUnlikedCommentIds.has(commentId)) {
      return false;
    }
    // Otherwise check if it's in the liked set
    return likedCommentIds.has(commentId) || false;
  };

  // Simple function to check if a comment is liked (for compatibility)
  const checkCommentLikeStatus = (commentId: string): boolean => {
    return hasCommentLike(commentId) || false;
  };
  
  // Function to check like status with backend and update local state
  const checkAndUpdateLikeStatus = async (
    postId: string,
    commentId: string
  ): Promise<boolean> => {
    try {
      console.log(`JobSeeker: Checking like status for comment ${commentId} with API`);
      const isLiked = await checkCommentLiked(postId, commentId);
      console.log(`JobSeeker: API response for comment ${commentId} like status: ${isLiked}`);
      
      if (isLiked) {
        setLikedCommentIds((prev) => new Set([...prev, commentId]));
        console.log(`JobSeeker: Adding ${commentId} to likedCommentIds from API check`);
      } else {
        setLikedCommentIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
      }
      return isLiked;
    } catch (error) {
      console.error(`Error checking like status for ${commentId}:`, error);
      // In case of error, rely on local state
      return likedCommentIds.has(commentId) || false;
    }
  };

  // Helper function to update like status recursively in comment tree
  const updateCommentLikeStatus = (
    comment: Comment,
    targetId: string,
    isLiked: boolean
  ): Comment => {
    if (comment.id === targetId) {
      // If comment is already in desired state, don't change the count to avoid double counting
      if (comment.isUpvoted === isLiked) {
        return comment; // Already in desired state, don't modify
      }

      // Otherwise, update like status and count properly
      return {
        ...comment,
        isUpvoted: isLiked,
        // For likes: if not already liked, increment by 1
        // For unlikes: if currently liked, decrement by 1
        likeCount: isLiked
          ? comment.isUpvoted
            ? comment.likeCount || 0
            : (comment.likeCount || 0) + 1
          : comment.isUpvoted
          ? Math.max(0, (comment.likeCount || 1) - 1)
          : comment.likeCount || 0,
      };
    }

    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: comment.replies.map((reply) =>
          updateCommentLikeStatus(reply, targetId, isLiked)
        ),
      };
    }

    return comment;
  };
  
  // Populate likedCommentIds when comments load
  useEffect(() => {
    const initializeLikes = async () => {
      if (!comments || comments.length === 0 || !selectedPost) return;

      const likedIds = new Set<string>();

      // Recursive function to check comments and replies
      const processComment = async (comment: Comment) => {
        // Check if comment is already marked as liked by the server
        if (comment.isUpvoted) {
          likedIds.add(comment.id);
          console.log(`JobSeeker: Adding ${comment.id} to likedCommentIds because isUpvoted is true`);
        } else {
          // Double check with the API if needed
          try {
            const isLiked = await checkCommentLiked(selectedPost.id, comment.id);
            if (isLiked) {
              likedIds.add(comment.id);
              console.log(`JobSeeker: Adding ${comment.id} to likedCommentIds after API check`);
            }
          } catch (error) {
            console.error(`JobSeeker: Error checking like status for comment ${comment.id}:`, error);
          }
        }

        // Process any replies
        if (comment.replies && comment.replies.length > 0) {
          for (const reply of comment.replies) {
            await processComment(reply);
          }
        }
      };

      // Process all comments
      for (const comment of comments) {
        await processComment(comment);
      }

      // Update state with liked comments
      console.log("JobSeeker: Setting likedCommentIds to:", [...likedIds]);
      setLikedCommentIds(likedIds);
    };
    
    initializeLikes();
  }, [comments, selectedPost]);

  const toggleCommentLike = (
    postId: string,
    commentId: string,
    isCurrentlyLiked: boolean
  ) => {
    // Prevent rapid toggling (debounce)
    const now = Date.now();
    const lastToggle = lastToggleTime[commentId] || 0;
    if (now - lastToggle < 500) {
      // 500ms debounce
      return; // Ignore rapid clicks
    }

    // Update last toggle time
    setLastToggleTime((prev) => ({
      ...prev,
      [commentId]: now,
    }));

    // First, update the UI optimistically for immediate feedback
    queryClient.setQueryData<Comment[]>(
      ["post-comments", postId],
      (oldData) => {
        if (!oldData) return [];
        return oldData.map((comment) =>
          updateCommentLikeStatus(comment, commentId, !isCurrentlyLiked)
        );
      }
    );

    // Now, handle the state updates and API calls
    if (isCurrentlyLiked) {
      // UNLIKE ACTION
      // Update UI state immediately
      setLikedCommentIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });

      setExplicitlyUnlikedCommentIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(commentId);
        return newSet;
      });

      // Then call API (which will check if the comment is actually liked first)
      unlikeCommentMutation.mutate({ postId, commentId });
    } else {
      // LIKE ACTION
      // Update UI state immediately
      setLikedCommentIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(commentId);
        return newSet;
      });

      setExplicitlyUnlikedCommentIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });

      // Then call API (which will check if the comment is already liked first)
      likeCommentMutation.mutate({ postId, commentId });
    }
  };

  const openCommentModal = (post: Post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  };

  const closeCommentModal = () => {
    setCommentModalVisible(false);
    setSelectedPost(null);
    setNewCommentText("");
    setReplyToComment(null);
    setReplyingToUsername(null);
  };

  const handleAddComment = async (postId: string) => {
    if (newCommentText.trim() === "") return;

    const newComment: Comment = {
      id: Date.now().toString(),
      username: username,
      avatar: userProfileImage || "",
      text: newCommentText,
      time: "Just now",
      isUpvoted: false,
      userId: data.id,
      likeCount: 0,
    };

    try {
      await addCommentMutation.mutateAsync({
        postId,
        comment: {
          comment: newCommentText,
          userId: data.id,
          userType: data.userType,
          parentCommentId: replyToComment || null,
        },
      });

      setNewCommentText("");
      setReplyToComment(null);
      setReplyingToUsername(null);
    } catch (error) {
      Alert.alert("Error", "Failed to add comment");
    }
  };

  const startReply = (commentId: string, username: string) => {
    setReplyToComment(commentId);
    setReplyingToUsername(username);
  };

  const cancelReply = () => {
    setReplyToComment(null);
    setReplyingToUsername(null);
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this post?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => deletePostMutation.mutate(postId),
          style: "destructive",
        },
      ],
      { cancelable: false }
    );
  };

  const handleOpenEditModal = (post: Post) => {
    setEditingPostDetails(post);
    setEditedContentText(post.postContent);
    const existingImageUrl = post.postImage
      ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${post.postImage}`
      : null;
    setEditedImageDisplayUri(existingImageUrl);
    setNewLocalImageForEditUri(null);
    setIsEditModalVisible(true);
  };

  const handlePickEditImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditedImageDisplayUri(result.assets[0].uri);
      setNewLocalImageForEditUri(result.assets[0].uri);
    }
  };

  const handleRemoveEditImage = () => {
    setEditedImageDisplayUri(null);
    setNewLocalImageForEditUri(null);
  };

  const handleSaveEditedPost = () => {
    if (!editingPostDetails) return;

    const { id: postId, postImage: originalPostImageUrlPart } =
      editingPostDetails;

    const updatedData: { postContent: string; newPostImage?: string | null } = {
      postContent: editedContentText,
    };

    if (newLocalImageForEditUri) {
      updatedData.newPostImage = newLocalImageForEditUri;
    } else if (editedImageDisplayUri === null && originalPostImageUrlPart) {
      updatedData.newPostImage = null;
    }

    editPostMutation.mutate({ postId, updatedData });
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentTextForComment(comment.text);
  };

  const handleSaveComment = (postId: string, commentId: string) => {
    if (!editingCommentTextForComment.trim()) {
      Alert.alert("Error", "Comment cannot be empty.");
      return;
    }
    editCommentMutation.mutate({
      postId,
      commentId,
      newText: editingCommentTextForComment,
    });
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentTextForComment("");
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCommentMutation.mutate({ postId, commentId }),
        },
      ]
    );
  };

  const renderComment = (comment: Comment, isReply = false, postId: string) => {
    return (
      <View
        key={comment.id}
        style={[styles.commentContainer, isReply && styles.replyContainer]}
      >
        <Image
          source={
            comment.avatar
              ? { uri: comment.avatar }
              : require("assets/images/default-user.png")
          }
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentBubble}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentUsername}>{comment.username}</Text>
              {data &&
                comment.userId === data.id &&
                editingCommentId !== comment.id && (
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      onPress={() => handleEditComment(comment)}
                      style={styles.commentActionButton}
                    >
                      <MaterialIcons name="edit" size={16} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(postId, comment.id)}
                      style={styles.commentActionButton}
                    >
                      <MaterialIcons name="delete" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                )}
            </View>
            {editingCommentId === comment.id ? (
              <View>
                <TextInput
                  value={editingCommentTextForComment}
                  onChangeText={setEditingCommentTextForComment}
                  style={styles.editingCommentInput || styles.commentInput}
                  autoFocus
                  multiline
                />
                <View
                  style={
                    styles.commentActionGroup || {
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 5,
                    }
                  }
                >
                  <TouchableOpacity
                    onPress={() => handleSaveComment(postId, comment.id)}
                    style={{ marginRight: 10 }}
                  >
                    <Text style={{ color: "#0077B5" }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelEditComment}>
                    <Text style={{ color: "#666" }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.commentText}>{comment.text}</Text>
            )}
          </View>
          {editingCommentId !== comment.id && (
            <View style={styles.commentActions}>
              <Text style={styles.commentTime}>{comment.time}</Text>
              <TouchableOpacity
                onPress={() => {
                  toggleCommentLike(
                    postId,
                    comment.id,
                    explicitlyUnlikedCommentIds.has(comment.id)
                      ? false
                      : !!comment.isUpvoted
                  );
                }}
                style={styles.commentActionButton}
              >
                <Ionicons
                  name={
                    // Explicitly unliked comments override everything else
                    explicitlyUnlikedCommentIds.has(comment.id)
                      ? "heart-outline"
                      : comment.isUpvoted || hasCommentLike(comment.id)
                      ? "heart"
                      : "heart-outline"
                  }
                  size={16}
                  color={
                    // Explicitly unliked comments override everything else
                    explicitlyUnlikedCommentIds.has(comment.id)
                      ? "#666"
                      : comment.isUpvoted || hasCommentLike(comment.id)
                      ? "#0077B5"
                      : "#666"
                  }
                />
                <Text
                  style={[
                    styles.commentAction,
                    {
                      marginLeft: 3,
                      color: explicitlyUnlikedCommentIds.has(comment.id)
                        ? "#666"
                        : comment.isUpvoted || hasCommentLike(comment.id)
                        ? "#0077B5"
                        : "#666",
                    },
                  ]}
                >
                  {/* Display the like count with optimistic UI adjustments */}
                  {(() => {
                    // Start with the server's like count - this ensures we show existing likes from other users
                    const serverCount = comment.likeCount !== undefined ? comment.likeCount : 0;
                    
                    // Apply adjustments based on the current user's actions
                    let displayCount = serverCount;
                    
                    // If the user liked it locally but it's not reflected in server data yet
                    if (hasCommentLike(comment.id) && !comment.isUpvoted) {
                      displayCount += 1;
                    }
                    
                    // If the user unliked it locally but it's not reflected in server data yet
                    if (explicitlyUnlikedCommentIds.has(comment.id) && comment.isUpvoted) {
                      displayCount = Math.max(0, displayCount - 1);
                    }
                    
                    return displayCount;
                  })()}
                  {" "}
                  {/* Pluralization logic */}
                  {(() => {
                    // Get the display count using the same logic as above
                    const serverCount = comment.likeCount !== undefined ? comment.likeCount : 0;
                    let displayCount = serverCount;
                    
                    if (hasCommentLike(comment.id) && !comment.isUpvoted) {
                      displayCount += 1;
                    }
                    if (explicitlyUnlikedCommentIds.has(comment.id) && comment.isUpvoted) {
                      displayCount = Math.max(0, displayCount - 1);
                    }
                    
                    return displayCount === 1 ? "Like" : "Likes";
                  })()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setReplyToComment(comment.id);
                  setReplyingToUsername(comment.username);
                }}
              >
                <Text style={styles.commentAction}>Reply</Text>
              </TouchableOpacity>
            </View>
          )}
          {comment.replies && comment.replies.length > 0 && !isReply && (
            <View style={styles.repliesContainer}>
              {comment.replies.map((reply) =>
                renderComment(reply, true, postId)
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPost = ({ item }: { item: Post }) => {
    const imageUrl = item.postImage
      ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item.postImage}`
      : null;

    const profileImageUrl = item.profileImage
      ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item.profileImage}`
      : null;

    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <Image
            source={
              profileImageUrl
                ? { uri: profileImageUrl }
                : require("assets/images/default-user.png")
            }
            style={styles.avatar}
          />
          <View style={styles.postHeaderContent}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.time}>
              {new Date(item.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          {data && item.jobSeekerId === data.id && (
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.postActionButton}
                onPress={() => handleOpenEditModal(item)}
              >
                <Ionicons name="create-outline" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postActionButton}
                onPress={() => handleDeletePost(item.id)}
              >
                <MaterialIcons name="delete" size={20} color="#555" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.content}>{item.postContent}</Text>

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.stats}>
          <Text style={styles.statsText}>
            {item.likeCount} Likes • {item.commentCount} Comments
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleUpvote(item.id)}
          >
            <Ionicons
              name={item.isUpvoted ? "heart" : "heart-outline"}
              size={20}
              color={item.isUpvoted ? "#0077B5" : "#666"}
            />
            <Text
              style={[
                styles.actionText,
                item.isUpvoted ? styles.activeActionText : null,
              ]}
            >
              Like
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openCommentModal(item)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="share-social-outline" size={20} color="#666" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        Platform.OS === "android" && styles.androidContainer,
      ]}
    >
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      <TouchableOpacity
        style={styles.createPostTrigger}
        onPress={() => setShowCreatePost(true)}
      >
        <Image
          source={
            userProfileImage
              ? { uri: userProfileImage }
              : require("assets/images/default-user.png")
          }
          style={styles.userAvatar}
        />
        <View style={styles.createPostPlaceholder}>
          <Text style={styles.createPostText}>
            Share a professional update...
          </Text>
        </View>
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B5" />
        </View>
      )}

      {!isLoading && isError && (
        <View style={[styles.noPostsContainer, styles.errorContainer]}>
          <Text style={styles.errorText}>
            Failed to load posts. Pull down to retry.
          </Text>
        </View>
      )}

      {!isLoading &&
        !isError &&
        (fetchedPosts.length === 0 ? (
          <View style={styles.noPostsContainer}>
            <Text style={styles.noPostsText}>
              There are no posts yet. Be the first to share!
            </Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            renderItem={({ item, index }) => (
              <View key={`post-${item.id || index}`}>
                {renderPost({ item })}
              </View>
            )}
            keyExtractor={(item, index) => `post-${item.id || index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feedContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#0077B5"]}
                tintColor="#0077B5"
              />
            }
          />
        ))}

      <Modal
        animationType="slide"
        transparent={false}
        visible={showCreatePost}
        onRequestClose={() => setShowCreatePost(false)}
      >
        <SafeAreaView
          style={[
            styles.container,
            Platform.OS === "android" && styles.androidContainer,
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowCreatePost(false);
                setNewPostText("");
                setSelectedImage(null);
              }}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Post</Text>
            <TouchableOpacity
              onPress={handleAddPost}
              disabled={newPostText.trim() === "" && !selectedImage}
              style={[
                styles.postButton,
                newPostText.trim() === "" && !selectedImage
                  ? styles.disabledButton
                  : null,
              ]}
            >
              <Text style={styles.postButtonText}>Post</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.userInfoContainer}>
              <Image
                source={
                  userProfileImage
                    ? { uri: userProfileImage }
                    : require("assets/images/default-user.png")
                }
                style={styles.userAvatar}
              />
              <View>
                <Text style={styles.username}>{username}</Text>
                <Text style={styles.jobTitle}>
                  {data?.userType === "client" ? "Client" : "Job Seeker"}
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.postInputFull}
              placeholder="Share a professional update, job opportunity, or ask for advice..."
              value={newPostText}
              onChangeText={setNewPostText}
              multiline
              autoFocus
            />

            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.selectedImage}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={styles.postOptions}>
            <Text style={styles.addToYourPost}>Add to your post</Text>
            <View style={styles.postOptionsButtons}>
              <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
                <MaterialIcons name="photo-library" size={24} color="#0077B5" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={isEditModalVisible}
        onRequestClose={() => {
          setIsEditModalVisible(false);
          setEditingPostDetails(null);
          setNewLocalImageForEditUri(null);
          setEditedImageDisplayUri(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setIsEditModalVisible(false);
                setEditingPostDetails(null);
                setNewLocalImageForEditUri(null);
                setEditedImageDisplayUri(null);
              }}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Post</Text>
            <TouchableOpacity
              style={[
                styles.postButton,
                (!editedContentText && !editedImageDisplayUri) ||
                editPostMutation.isPending
                  ? styles.disabledButton
                  : {},
              ]}
              onPress={handleSaveEditedPost}
              disabled={
                (!editedContentText && !editedImageDisplayUri) ||
                editPostMutation.isPending
              }
            >
              {editPostMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.userInfoContainer}>
              <Image
                source={{
                  uri: userProfileImage || "https://via.placeholder.com/150",
                }}
                style={styles.userAvatar}
              />
              <View>
                <Text style={styles.username}>{username}</Text>
                <Text style={styles.jobTitle}>
                  {data?.userType || "Job Seeker"}
                </Text>
              </View>
            </View>
            <TextInput
              style={styles.postInputFull}
              placeholder={`Edit your post...`}
              multiline
              value={editedContentText}
              onChangeText={setEditedContentText}
            />
            {editedImageDisplayUri && (
              <View style={styles.selectedImageContainer}>
                <Image
                  source={{ uri: editedImageDisplayUri }}
                  style={styles.selectedImage}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveEditImage}
                >
                  <Ionicons name="close-circle" size={24} color="#000" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          <View style={styles.postOptions}>
            <Text style={styles.addToYourPost}>Add to your post</Text>
            <View style={styles.postOptionsButtons}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={handlePickEditImage}
              >
                <Ionicons name="images" size={24} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={commentModalVisible}
        onRequestClose={closeCommentModal}
      >
        <SafeAreaView
          style={[
            styles.container,
            Platform.OS === "android" && styles.androidContainer,
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeCommentModal}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedPost && (
            <>
              <View style={styles.originalPostReference}>
                <View style={styles.postHeader}>
                  <Image
                    source={
                      selectedPost.profileImage
                        ? {
                            uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${selectedPost.profileImage}`,
                          }
                        : require("assets/images/default-user.png")
                    }
                    style={styles.smallAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.username}>{selectedPost.username}</Text>
                    <Text style={styles.time}>
                      {new Date(selectedPost.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </Text>
                  </View>
                </View>
                <Text style={styles.originalPostContent} numberOfLines={2}>
                  {selectedPost.postContent}
                </Text>
              </View>

              <ScrollView style={styles.commentsScrollView}>
                {selectedPost && (
                  <>
                    {commentsLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#0077B5" />
                      </View>
                    ) : commentsError ? (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                          Failed to load comments
                        </Text>
                      </View>
                    ) : !comments || comments.length === 0 ? (
                      <View style={styles.noCommentsContainer}>
                        <Text style={styles.noCommentsText}>
                          No comments yet. Be the first to comment!
                        </Text>
                      </View>
                    ) : (
                      comments.map((comment: Comment) =>
                        renderComment(comment, false, selectedPost.id)
                      )
                    )}
                  </>
                )}
              </ScrollView>

              <View style={styles.commentInputSection}>
                {replyingToUsername && (
                  <View style={styles.replyingToContainer}>
                    <Text style={styles.replyingToText}>
                      Replying to{" "}
                      <Text style={{ fontWeight: "bold" }}>
                        {replyingToUsername}
                      </Text>
                    </Text>
                    <TouchableOpacity onPress={cancelReply}>
                      <Ionicons name="close" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.addCommentContainer}>
                  <Image
                    source={
                      userProfileImage
                        ? { uri: userProfileImage }
                        : require("assets/images/default-user.png")
                    }
                    style={styles.commentAvatar}
                  />
                  <TextInput
                    style={styles.commentInput}
                    placeholder={
                      replyingToUsername
                        ? `Reply to ${replyingToUsername}...`
                        : "Write a comment..."
                    }
                    placeholderTextColor="#333"
                    value={newCommentText}
                    onChangeText={setNewCommentText}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={() => handleAddComment(selectedPost.id)}
                    disabled={newCommentText.trim() === ""}
                  >
                    <Ionicons
                      name="send"
                      size={20}
                      color={
                        newCommentText.trim() === "" ? "#B0C4DE" : "#0077B5"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        transparent
        visible={showSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <Ionicons name="checkmark-circle" size={50} color="#0b8043" />
            <Text style={styles.successModalText}>
              Post uploaded successfully!
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#f3f6f8",
  },
  androidContainer: {
    marginTop: Platform.OS === "android" ? StatusBar.currentHeight || 25 : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e9ee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0b216f",
  },
  createPostTrigger: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e9ee",
    marginBottom: 8,
  },
  createPostPlaceholder: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#e1e9ee",
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
  },
  createPostText: {
    color: "#666",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#0077B5",
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: "#b0c4de",
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  feedContainer: {
    paddingBottom: 15,
  },
  postContainer: {
    backgroundColor: "#fff",
    marginBottom: 8,
    padding: 15,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  postHeaderContent: {
    flex: 1,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  postActionButton: {
    padding: 5,
    marginLeft: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#f0f0f0",
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  username: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
  },
  jobTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  time: {
    color: "#999",
    fontSize: 12,
  },
  content: {
    fontSize: 15,
    marginBottom: 15,
    lineHeight: 22,
    color: "#333",
  },
  postImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    marginVertical: 10,
  },
  stats: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e9ee",
  },
  statsText: {
    color: "#666",
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  actionText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 14,
  },
  activeActionText: {
    color: "#0077B5",
    fontWeight: "500",
  },
  commentSection: {
    borderTopWidth: 1,
    borderTopColor: "#e1e9ee",
    paddingTop: 15,
    marginTop: 5,
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e1e9ee",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: "#f5f5f5",
    fontSize: 14,
  },
  sendButton: {
    padding: 8,
  },
  commentContainer: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-start",
  },
  replyContainer: {
    marginLeft: 40,
    paddingLeft: 10,
    marginTop: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#e1e9ee",
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: "#f0f2f5",
    padding: 10,
    borderRadius: 15,
    borderTopLeftRadius: 0,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  commentActionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 6,
    paddingVertical: 2,
  },
  commentUsername: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#1c1e21",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: "#1c1e21",
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: "#65676B",
    marginRight: 12,
  },
  commentAction: {
    fontSize: 12,
    color: "#65676B",
    fontWeight: "600",
  },
  repliesContainer: {
    marginTop: 8,
  },
  replyLikeButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  replyLikeText: {
    fontSize: 12,
    color: "#65676B",
    marginLeft: 4,
  },
  replyLikeTextActive: {
    color: "#0077B5",
    fontWeight: "500",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e9ee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0b216f",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  postInputFull: {
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 120,
    color: "#333",
  },
  selectedImageContainer: {
    marginTop: 15,
    position: "relative",
  },
  selectedImage: {
    width: "100%",
    height: 200,
    borderRadius: 5,
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 15,
  },
  postOptions: {
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e9ee",
  },
  addToYourPost: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  postOptionsButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  optionButton: {
    padding: 10,
  },
  commentsScrollView: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },
  originalPostReference: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e9ee",
  },
  originalPostContent: {
    fontSize: 14,
    color: "#666",
    paddingLeft: 46,
  },
  commentInputSection: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e9ee",
    padding: 10,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  replyingToContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f0f7ff",
    borderRadius: 15,
    marginBottom: 10,
  },
  replyingToText: {
    color: "#0077B5",
    fontSize: 13,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  noPostsContainer: {
    padding: 20,
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  noPostsText: {
    color: "#666",
    textAlign: "center",
  },
  noCommentsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noCommentsText: {
    color: "#666",
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
    maxWidth: 300,
  },
  successModalText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 15,
  },
  editingCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e1e9ee",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: "#f5f5f5",
    fontSize: 14,
  },
  commentActionGroup: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 5,
  },
});

export default SocialFeedScreen;

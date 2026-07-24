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

type Comment = {
  id: string;
  username: string;
  avatar: string | null;
  text: string;
  time: string;
  replies?: Comment[];
  isUpvoted?: boolean;
  userId?: string;
  likeCount?: number; // Make sure likeCount is properly typed
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
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // State for Edit Post Modal
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingPostDetails, setEditingPostDetails] = useState<Post | null>(
    null
  );
  const [editedContentText, setEditedContentText] = useState<string>("");
  const [editedImageDisplayUri, setEditedImageDisplayUri] = useState<
    string | null
  >(null); // For displaying in modal (can be remote or local)
  const [newLocalImageForEditUri, setNewLocalImageForEditUri] = useState<
    string | null
  >(null); // New local image picked by user

  // State for Comment Editing (Restored)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentTextForComment, setEditingCommentTextForComment] =
    useState<string>("");

  // State to track which comments are liked by the current user
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    new Set()
  );
  
  // State to track explicitly unliked comments - this will override any other state
  const [explicitlyUnlikedCommentIds, setExplicitlyUnlikedCommentIds] = useState<Set<string>>(
    new Set()
  );

  const {
    data: fetchedPosts = [],
    isLoading,
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
  } = useQuery<Comment[]>({
    queryKey: ["post-comments", selectedPost?.id],
    queryFn: async () => {
      if (!selectedPost) return [];
      const comments = await fetchPostComments(selectedPost.id);
      // Detailed logging to see what's coming from the server
      console.log("Server response for comments:", 
        comments.map((c: any) => ({ 
          id: c.id, 
          likeCount: c.likeCount || 0, 
          isUpvoted: !!c.isUpvoted,
          username: c.username
        }))
      );
      
      // Make sure we return the server-provided like counts
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
      // First, check if the comment is already liked to prevent 404 errors
      try {
        const isAlreadyLiked = await checkCommentLiked(data.postId, data.commentId);
        if (isAlreadyLiked) {
          return { success: true, alreadyLiked: true };
        }
        return likeCommentOrReply(data.postId, data.commentId);
      } catch (error) {
        // If error checking status, attempt the like anyway
        return likeCommentOrReply(data.postId, data.commentId);
      }
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
      queryClient.setQueryData(["post-comments", variables.postId], (oldData: Comment[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(comment => updateCommentLikeStatus(comment, variables.commentId, true));
      });

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
      // First, check if the comment is actually liked to prevent 404 errors
      try {
        const isLiked = await checkCommentLiked(data.postId, data.commentId);
        if (!isLiked) {
          return { success: true, notLiked: true };
        }
        return unlikeCommentOrReply(data.postId, data.commentId);
      } catch (error) {
        // If error checking status, attempt the unlike anyway
        return unlikeCommentOrReply(data.postId, data.commentId);
      }
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
      queryClient.setQueryData(["post-comments", variables.postId], (oldData: Comment[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(comment => updateCommentLikeStatus(comment, variables.commentId, false));
      });

      // Optional: Update community posts for other screens
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (error: any) => {
      console.error("Error unliking comment:", error.message);
      // Even on error, update the UI as if it succeeded
      // This ensures better UX by keeping the UI consistent with what the user expects
    },
  });

  // Function to recursively check and update comment likes
  const processCommentsForLikes = async (
    comments: Comment[],
    postId: string
  ) => {
    const likedIds = new Set<string>();

    // Get current liked IDs to preserve user's recent actions
    const currentLikedIds = likedCommentIds;

    // Process each comment (and its replies)
    const processComment = async (comment: Comment) => {
      try {
        // Skip checking comments the user has explicitly unliked recently
        // This prevents the backend from overriding recent user actions
        if (comment.id in currentLikedIds) {
          // Keep existing state - don't check with backend
          likedIds.add(comment.id);
        } else if (!comment.isUpvoted) {
          const isLiked = await checkCommentLiked(postId, comment.id);
          if (isLiked) {
            likedIds.add(comment.id);
          }
        } else {
          // Comment is already marked as liked
          likedIds.add(comment.id);
        }

        // Process replies recursively
        if (comment.replies && comment.replies.length > 0) {
          for (const reply of comment.replies) {
            await processComment(reply);
          }
        }
      } catch (error) {
        console.error(
          `Error processing like status for comment ${comment.id}:`,
          error
        );
      }
    };

    // Process all top-level comments
    for (const comment of comments) {
      await processComment(comment);
    }

    // Update our local state with the results
    setLikedCommentIds(likedIds);
    return likedIds;
  };

  // Add an effect to process comments and populate the likedCommentIds set
  // Initialize likedCommentIds when comments load
  useEffect(() => {
    const initializeLikes = async () => {
      if (!comments || comments.length === 0 || !selectedPost) return;
      
      const likedIds = new Set<string>();
      
      // Recursive function to check comments and replies
      const processComment = async (comment: Comment) => {
        // Check if comment is already marked as liked by the server
        if (comment.isUpvoted) {
          likedIds.add(comment.id);
          console.log(`Adding ${comment.id} to likedCommentIds because isUpvoted is true`);
        } else {
          // Double check with the API if needed
          try {
            const isLiked = await checkCommentLiked(selectedPost.id, comment.id);
            if (isLiked) {
              likedIds.add(comment.id);
              console.log(`Adding ${comment.id} to likedCommentIds after API check`);
            }
          } catch (error) {
            console.error(`Error checking like status for comment ${comment.id}:`, error);
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
      console.log("Setting likedCommentIds to:", [...likedIds]);
      setLikedCommentIds(likedIds);
    };
    
    initializeLikes();
  }, [comments, selectedPost]);

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

  async () => {
    const { data } = await decodeToken();
    const profileImage = data.profileImage;
    return profileImage;
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

  const toggleUpvote = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            const currentLikeCount = post.likeCount || 0;
            const newIsUpvoted = !post.isUpvoted;
            return {
              ...post,
              isUpvoted: newIsUpvoted,
              likeCount: newIsUpvoted
                ? currentLikeCount + 1
                : Math.max(0, currentLikeCount - 1),
              upvotes: newIsUpvoted
                ? currentLikeCount + 1
                : Math.max(0, currentLikeCount - 1),
            };
          }
          return post;
        })
      );

      if (post.isUpvoted) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      console.error("Error toggling upvote:", error);

      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            const currentLikeCount = post.likeCount || 0;
            return {
              ...post,
              isUpvoted: post.isUpvoted,
              likeCount: post.isUpvoted
                ? currentLikeCount + 1
                : Math.max(0, currentLikeCount - 1),
              upvotes: post.isUpvoted
                ? currentLikeCount + 1
                : Math.max(0, currentLikeCount - 1),
            };
          }
          return post;
        })
      );
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
      replies: [],
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
      console.error("Error adding comment:", error);
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

  const handleStartEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentTextForComment(comment.text);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentTextForComment("");
  };

  const handleSaveEditedComment = (postId: string, commentId: string) => {
    if (editingCommentTextForComment.trim() === "") {
      Alert.alert("Error", "Comment cannot be empty.");
      return;
    }
    // No need to check selectedPost here as postId is passed directly
    editCommentMutation.mutate({
      postId: postId,
      commentId,
      newText: editingCommentTextForComment,
    });
  };

  const handleConfirmDeleteComment = (postId: string, commentId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this comment? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => {
            // No need to check selectedPost here as postId is passed directly
            deleteCommentMutation.mutate({ postId: postId, commentId });
          },
          style: "destructive",
        },
      ]
    );
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

  // Function to fetch the accurate like count for a comment
  const fetchCommentLikeCount = async (postId: string, commentId: string) => {
    try {
      // We could add a dedicated API endpoint for this, but for now we'll refetch all comments
      // which will include the updated like counts
      await refetchComments();
      return true;
    } catch (error) {
      console.error("Error fetching comment like count:", error);
      return false;
    }
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
      console.log(`Checking like status for comment ${commentId} with API`);
      const isLiked = await checkCommentLiked(postId, commentId);
      console.log(`API response for comment ${commentId} like status: ${isLiked}`);
      
      if (isLiked) {
        setLikedCommentIds((prev) => new Set([...prev, commentId]));
        console.log(`Adding ${commentId} to likedCommentIds from API check`);
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

  // Helper function to add any local like state to comments returned from backend
  const enhanceCommentWithLocalLikeState = (
    comment: Comment,
    postId: string
  ): Comment => {
    // If we know locally that this comment is liked, make sure it's reflected
    if (likedCommentIds.has(comment.id)) {
      comment = {
        ...comment,
        isUpvoted: true,
        likeCount: Math.max(1, comment.likeCount || 0), // Ensure it's at least 1
      };
    } else {
      // If we've explicitly unliked it locally, make sure that's reflected
      // This is the key fix - ensure explicitly unliked comments stay unliked
      comment = {
        ...comment,
        isUpvoted: false,
        likeCount: comment.likeCount || 0,
      };
    }

    // Process replies recursively
    if (comment.replies && comment.replies.length > 0) {
      comment.replies = comment.replies.map((reply) =>
        enhanceCommentWithLocalLikeState(reply, postId)
      );
    }

    return comment;
  };

  // Function to ensure like counts are accurate after toggling likes
  const ensureAccurateLikeCounts = (postId: string) => {
    // Don't refetch automatically - our optimistic updates are more accurate
    // than what the backend sends back. We will manually update the cache.
  };

  // Track last toggle time to prevent too rapid toggling
  const [lastToggleTime, setLastToggleTime] = useState<Record<string, number>>(
    {}
  );

  // Helper function to update like status recursively in comment tree
  const updateCommentLikeStatus = (comment: Comment, targetId: string, isLiked: boolean): Comment => {
    if (comment.id === targetId) {
      // If comment is already in desired state, don't change the count to avoid double counting
      if (comment.isUpvoted === isLiked) {
        return comment; // Already in desired state, don't modify
      }

      // Calculate the new like count based on the server's count and our action
      // We need to be careful not to zero out existing likes from other users
      const newLikeCount = isLiked
        // For likes: increment by 1 only if we haven't already liked it
        ? (comment.isUpvoted ? comment.likeCount || 0 : (comment.likeCount || 0) + 1)
        // For unlikes: decrement by 1 only if we currently have it liked
        : (comment.isUpvoted ? Math.max(0, (comment.likeCount || 1) - 1) : comment.likeCount || 0);

      // Update like status and count
      return {
        ...comment,
        isUpvoted: isLiked,
        likeCount: newLikeCount
      };
    }
    
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: comment.replies.map(reply => updateCommentLikeStatus(reply, targetId, isLiked)),
      };
    }
    
    return comment;
  };

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
        return oldData.map((comment) => updateCommentLikeStatus(comment, commentId, !isCurrentlyLiked));
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

  const renderComment = (comment: Comment, isReply = false, postId: string) => (
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
            {/* Ownership check: Ideally use comment.userId === currentUserId, fallback to username */}
            {username === comment.username && (
              <View style={styles.commentActionsRow}>
                {editingCommentId === comment.id ? (
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      style={styles.commentActionButton}
                      onPress={() =>
                        handleSaveEditedComment(postId, comment.id)
                      }
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="green"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.commentActionButton}
                      onPress={handleCancelEditComment}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color="red"
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      style={styles.commentActionButton}
                      onPress={() => handleStartEditComment(comment)}
                    >
                      <Ionicons name="create-outline" size={16} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.commentActionButton}
                      onPress={() =>
                        handleConfirmDeleteComment(postId, comment.id)
                      }
                    >
                      <Ionicons name="trash-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
          {editingCommentId === comment.id ? (
            <TextInput
              style={styles.commentInputEditing}
              value={editingCommentTextForComment}
              onChangeText={setEditingCommentTextForComment}
              placeholder="Edit comment..."
              autoFocus
              multiline
            />
          ) : (
            <Text style={styles.commentText}>{comment.text}</Text>
          )}
        </View>
        {/* Actions like Time, Like, Reply - only show if not editing this comment */}
        {editingCommentId !== comment.id && (
          <View style={styles.commentActionsRow}>
            <Text style={styles.commentTime}>{comment.time}</Text>
            <TouchableOpacity
              onPress={() => {
                // First check with backend if not already tracked locally
                if (!likedCommentIds.has(comment.id) && !comment.isUpvoted) {
                  checkAndUpdateLikeStatus(postId, comment.id).then(
                    (isLiked) => {
                      toggleCommentLike(postId, comment.id, isLiked);
                    }
                  );
                } else {
                  // Use local state or comment.isUpvoted if available
                  toggleCommentLike(
                    postId,
                    comment.id,
                    likedCommentIds.has(comment.id) || !!comment.isUpvoted
                  );
                }
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
                    ? "red"
                    : "#666"
                }
              />
              <Text style={styles.likeCount}>
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
                })()} {/* The like count */}
                
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
              onPress={() => startReply(comment.id, comment.username)}
            >
              <Text style={styles.commentAction}>Reply</Text>
            </TouchableOpacity>
          </View>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => renderComment(reply, true, postId))}
          </View>
        )}
      </View>
    </View>
  );

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
          {/* Ownership check for post edit/delete. data.id is current user's ID */}
          {data &&
            (item.clientId === data.id || item.jobSeekerId === data.id) && (
              <View style={styles.postHeaderActions}>
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
                  <Ionicons name="trash-outline" size={20} color="#666" />
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
    setNewLocalImageForEditUri(null); // Reset any new image picked previously
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
      setEditedImageDisplayUri(result.assets[0].uri); // Show the newly picked image
      setNewLocalImageForEditUri(result.assets[0].uri); // Store it as a new local image
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
      // User picked a new image
      updatedData.newPostImage = newLocalImageForEditUri;
    } else if (editedImageDisplayUri === null && originalPostImageUrlPart) {
      // User explicitly removed an existing image (and didn't pick a new one)
      updatedData.newPostImage = null;
    }
    // If newLocalImageForEditUri is null AND editedImageDisplayUri is NOT null,
    // it means the user is keeping the original image (or an image they haven't changed since opening modal).
    // In this case, newPostImage is left undefined, so the backend won't update it.

    editPostMutation.mutate({ postId, updatedData });
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B5" />
        </View>
      ) : fetchedPosts.length === 0 ? (
        <View style={styles.noPostsContainer}>
          <Text style={styles.noPostsText}>
            There are no posts yet. Be the first to share!
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item, index }) => (
            <View key={`post-${item.id || index}`}>{renderPost({ item })}</View>
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
      )}

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

      {/* Edit Post Modal */}
      {editingPostDetails && (
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
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
                    {data?.userType || "Client"}
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
                {/* Add other options here if needed */}
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

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

const styles = StyleSheet.create({
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
  likeCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
    marginRight: 10,
    alignSelf: "center",
  },
  replyLikeCount: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    marginRight: 8,
    alignSelf: "center",
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
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    color: "red",
  },
  noCommentsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noCommentsText: {
    color: "#666",
  },
  noPostsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noPostsText: {
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
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  commentActionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 6, // Space between Like, Reply, Edit buttons
    paddingVertical: 2,
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
  postHeaderActions: {
    flexDirection: "row",
  },
  postHeaderActionIcon: {
    marginLeft: 10,
    padding: 5,
  },
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 15,
  },
  commentActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    // marginLeft: "auto", // Pushes edit/delete to the right if inside commentHeader - Handled by View structure now
    // Or use justifyContent: 'flex-end' if it's a standalone row
  },
  commentInputEditing: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    marginTop: 5,
    minHeight: 40,
  },
});

export default SocialFeedScreen;

import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { searchJobSeekers } from "../../api/search-request";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface JobSeeker {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  profileImage?: string;
  category?: string;
  rating?: number;
}

interface SearchResponse {
  data: JobSeeker[];
  pagination: { [key: string]: any };
}

interface Filter {
  id: string;
  label: string;
  count?: number;
}

const SearchScreen = () => {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<JobSeeker[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filter[]>([
    { id: "all", label: "All" },
  ]);

  const fetchJobSeekers = async (query: string, filter: string) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.push("/sign_in");
        return;
      }

      // Log the filter being used
      console.log("Using filter:", filter);

      // Prepare search options
      const options: { category?: string } = {};
      if (filter !== "all") {
        options.category = filter;
      }

      // Always send a request, even if query is empty
      // This allows us to fetch all job seekers in a specific category
      const results = (await searchJobSeekers(
        query || "", // Send empty string if query is null/undefined
        options
      )) as SearchResponse;
      
      setSearchResults(results.data);

      // Log the results to debug
      console.log("Search results count:", results.data.length);
      if (results.data && results.data.length > 0) {
        console.log("Search result IDs:", results.data.map(item => item.id));
      }
      console.log("Filter used:", filter);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // We don't need handleSearchChange since we're directly using setSearchQuery in the TextInput

  // Navigate to job seeker profile
  const handleJobSeekerSelect = (jobSeekerId: string) => {
    // Navigate to the specific job seeker view page
    router.push({
      pathname: "/screen/profile/view-profile/view-page-job-seeker" as any,
      params: { otherParticipantId: jobSeekerId }, // Pass ID as otherParticipantId
    });
  };

  const handleGoBack = () => {
    router.back();
  };

  // Render individual job seeker search result
  const renderSearchResult = ({ item }: { item: JobSeeker }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleJobSeekerSelect(item.id)}
    >
      <Image
        source={
          item.profileImage
            ? {
                uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item.profileImage}`,
              }
            : require("../../assets/images/default-user.png")
        }
        style={styles.resultImage}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>
          {item.firstName} {item.middleName} {item.lastName}
        </Text>
        <Text style={styles.resultCategory}>{item.category || "General"}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating || "No ratings"}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const fetchTopCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.push("/sign_in");
        return;
      }

      const response = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/jobs/top-categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();

      // Keep the original case from the database
      setFilters([
        { id: "all", label: "All" },
        ...data.categories.map((item: { category: string; count: any }) => ({
          id: item.category, // Keep original case
          label: item.category,
          count: item.count,
        })),
      ]);

      // Log the categories to debug
      console.log("Fetched categories:", data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchTopCategories();
  }, []);

  // Initial loading of job seekers based on filters
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Always fetch job seekers when a filter is selected, even if search query is empty
      fetchJobSeekers(searchQuery, selectedFilter);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedFilter]);

  const handleFilterSelect = (filterId: string) => {
    console.log("Selected filter:", filterId); // Debug log
    setSelectedFilter(filterId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back-outline" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search job seekers"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        style={styles.content}
        ListHeaderComponent={
          <>
            {/* Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersContainer}
            >
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterTab,
                    selectedFilter === filter.id && styles.selectedFilterTab,
                  ]}
                  onPress={() => handleFilterSelect(filter.id)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedFilter === filter.id && styles.selectedFilterText,
                    ]}
                  >
                    {filter.label}
                    {filter.count && filter.id !== "all"
                      ? ` (${filter.count})`
                      : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Show Popular Categories only in initial state (no search/filter active, no results from active search) */}
            {!isLoading && searchResults.length === 0 && !searchQuery && selectedFilter === "all" && (
              filters.length > 1 ? (
                <View style={[styles.recentSearchesContainer, { paddingHorizontal: 16 }]}>
                  <Text style={styles.recentSearchesTitle}>Popular Categories</Text>
                  {filters.slice(1, 6).map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={styles.recentSearchItem}
                      onPress={() => handleFilterSelect(filter.id)}
                    >
                      <Ionicons name="time-outline" size={20} color="#666" />
                      <Text style={styles.recentSearchText}>
                        {filter.label} {filter.count ? `(${filter.count})` : ""}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // This case (no popular categories to show initially) might need a different message or be null
                <View style={[styles.noResultsContainer, { paddingHorizontal: 16 }]}>
                  <Text style={styles.noResultsText}>Loading categories...</Text>
                </View>
              )
            )}
          </>
        }
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.searchResultsList}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="large"
              color="#007BFF"
              style={styles.loader}
            />
          ) : (searchQuery || selectedFilter !== "all") && searchResults.length === 0 ? ( // Only show if a search or non-"all" filter was active
            <View style={[styles.noResultsContainer, { paddingHorizontal: 16 }]}>
              <Ionicons name="search-outline" size={60} color="#ccc" />
              <Text style={styles.noResultsText}>No job seekers found</Text>
              <Text style={styles.noResultsSubtext}>
                {selectedFilter !== "all"
                  ? `No job seekers in the ${selectedFilter} category`
                  : "Try different keywords or filters"}
              </Text>
            </View>
          ) : null // If it's initial state and searchResults is empty, ListHeaderComponent handles it.
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingTop: Platform.OS === "android" ? 45 : 15,
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
    height: 45,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
  },
  filtersContainer: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 10,
  },
  selectedFilterTab: {
    backgroundColor: "#007BFF",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
  },
  selectedFilterText: {
    color: "#fff",
    fontWeight: "500",
  },
  loader: {
    marginTop: 20,
    alignSelf: 'center',
  },
  searchResultsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
    flexGrow: 1,
  },
  searchResultItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  resultCategory: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
  noResultsContainer: {
    padding: 40,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  recentSearchesContainer: {
    paddingTop: 20,
  },
  recentSearchesTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    marginBottom: 16,
  },
  recentSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  recentSearchText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
});

export default SearchScreen;

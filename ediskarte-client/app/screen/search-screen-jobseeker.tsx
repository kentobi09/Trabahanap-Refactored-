import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Job {
  id: string;
  jobTitle: string;
  jobDescription: string;
  category: string;
  jobLocation: string;
  budget: string;
  jobDuration: string;
  jobImage?: string;
  datePosted: string;
  client: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

interface SearchResponse {
  jobs: Job[];
  categories: string[];
  total: number;
}

interface Filter {
  id: string;
  label: string;
  count?: number;
}

const SearchScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Filter[]>([
    { id: 'all', label: 'All' }
  ]);

  const handleGoBack = () => {
    router.back();
  };

  const recentSearches = [
    'Plumber needed',
    'House cleaning',
    'Electrician for wiring',
    'Paint job',
  ];

  const fetchJobs = async (query: string, filter: string | null) => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        router.push('/sign_in');
        return;
      }

      // Log the filter being used
      console.log('Using filter:', filter);

      const response = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/jobs/search?searchQuery=${query}&filter=${filter || 'all'}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data: SearchResponse = await response.json();
      
      // Log the results to debug
      console.log('Search results:', data.jobs.length);
      console.log('Filter used:', filter);
      
      setSearchResults(data.jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTopCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        router.push('/sign_in');
        return;
      }

      const response = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/jobs/top-categories`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      
      // Keep the original case from the database
      setFilters([
        { id: 'all', label: 'All' },
        ...data.categories.map((item: { category: string; count: any; }) => ({
          id: item.category, // Keep original case
          label: item.category,
          count: item.count
        }))
      ]);

      // Log the categories to debug
      console.log('Fetched categories:', data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchTopCategories();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery || selectedFilter) {
        fetchJobs(searchQuery, selectedFilter);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedFilter]);

  const handleFilterSelect = (filterId: string) => {
    console.log('Selected filter:', filterId); // Debug log
    setSelectedFilter(filterId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs here"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipSelected,
              ]}
              onPress={() => handleFilterSelect(filter.id)}
            >
              <View style={styles.filterContent}>
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter.id && styles.filterTextSelected,
                ]}>
                  {filter.label}
                </Text>
                {filter.count !== undefined && filter.id !== 'all' && (
                  <Text style={[
                    styles.filterCount,
                    selectedFilter === filter.id && styles.filterCountSelected,
                  ]}>
                    {' '}({filter.count})
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Searches */}
        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <TouchableOpacity>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((search, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.recentSearchItem}
            >
              <View style={styles.recentSearchLeft}>
                <MaterialIcons name="history" size={20} color="#666" />
                <Text style={styles.recentSearchText}>{search}</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* Search Results */}
        {(searchQuery || selectedFilter) && (
          <View style={styles.searchResults}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0B153C" />
                <Text style={styles.loadingText}>Searching for jobs...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => router.push({
                    pathname: "../../../screen/job-seeker-screen/job-details",
                    params: {
                      id: job.id,
                      title: job.jobTitle,
                      postedDate: job.datePosted,
                      description: job.jobDescription,
                      rate: job.budget,
                      location: job.jobLocation,
                      otherParticipant: job.client.id,
                      jobImages: job.jobImage,
                      jobDuration: job.jobDuration,
                      clientFirstName: job.client.name.split(' ')[0],
                      clientLastName: job.client.name.split(' ')[1],
                      clientProfileImage: job.client.profileImage,
                      clientId: job.client.id,
                    }
                  })}
                >
                  <View style={styles.jobHeader}>
                    <View style={styles.clientInfo}>
                      <Image
                        source={{
                          uri: job.client.profileImage
                            ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/profiles/${
                                job.client.profileImage.split("profiles/")[1]
                              }`
                            : 'https://via.placeholder.com/40'
                        }}
                        style={styles.clientImage}
                        defaultSource={require('assets/images/client-user.png')}
                      />
                      <View style={styles.jobInfoContainer}>
                        <Text style={styles.jobTitle} numberOfLines={1} ellipsizeMode="tail">
                          {job.jobTitle}
                        </Text>
                        <Text style={styles.clientName} numberOfLines={1} ellipsizeMode="tail">
                          {job.client.name}
                        </Text>
                      </View>
                    </View>
                    {job.jobImage && (
                      <Image
                        source={{ 
                          uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/${
                            job.jobImage?.[0]?.split("job_request_files/")?.[1] ?? ''
                          }`
                        }}
                        style={styles.jobThumbnail}
                      />
                    )}
                  </View>

                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.jobDescription}
                  </Text>

                  <View style={styles.jobDetails}>
                    <View style={styles.jobDetail}>
                      <Ionicons name="cash-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>₱{job.budget}</Text>
                    </View>
                    <View style={styles.jobDetail}>
                      <Ionicons name="location-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>{job.jobLocation}</Text>
                    </View>
                    <View style={styles.jobDetail}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>{job.jobDuration}</Text>
                    </View>
                  </View>

                  <View style={styles.jobFooter}>
                    <View style={styles.categoryChip}>
                      <MaterialIcons name="category" size={14} color="#0B153C" />
                      <Text style={styles.categoryText}>{job.category}</Text>
                    </View>
                    <Text style={styles.timePosted}>
                      Posted {new Date(job.datePosted).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.noResultsText}>No jobs found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try adjusting your search or filters
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  content: {
    flex: 1,
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#0B153C',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextSelected: {
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearText: {
    color: '#0B153C',
    fontSize: 14,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentSearchText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  searchResults: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  clientImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  jobInfoContainer: {
    flex: 1,
    marginRight: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: '#666',
  },
  jobThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    flexWrap: 'wrap',
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8ECF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#0B153C',
    fontWeight: '500',
  },
  timePosted: {
    fontSize: 12,
    color: '#999',
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  filterCount: {
    fontSize: 12,
    color: '#666',
  },
  filterCountSelected: {
    color: '#fff',
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SearchScreen; 
import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';

interface SearchBarProps {
  onLocationSearch?: (query: string) => void;
  onUserSearch?: (query: string) => void;
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onLocationSearch,
  onUserSearch,
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'location' | 'user'>('location');

  const handleSearch = () => {
    if (!query.trim()) {
      Alert.alert('Search Required', 'Please enter a search term');
      return;
    }

    if (searchType === 'location' && onLocationSearch) {
      onLocationSearch(query.trim());
    } else if (searchType === 'user' && onUserSearch) {
      onUserSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Search Type Selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            searchType === 'location' && styles.typeButtonActive,
          ]}
          onPress={() => setSearchType('location')}
        >
          <Text
            style={[
              styles.typeButtonText,
              searchType === 'location' && styles.typeButtonTextActive,
            ]}
          >
            📍 Places
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.typeButton,
            searchType === 'user' && styles.typeButtonActive,
          ]}
          onPress={() => setSearchType('user')}
        >
          <Text
            style={[
              styles.typeButtonText,
              searchType === 'user' && styles.typeButtonTextActive,
            ]}
          >
            👤 Users
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={
            searchType === 'location' 
              ? 'Search places, cities, countries...' 
              : 'Search users...'
          }
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.searchButton, isLoading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={isLoading}
        >
          <Text style={styles.searchButtonText}>
            {isLoading ? '⏳' : '🔍'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 4,
  },
  
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  
  typeButtonTextActive: {
    color: '#ffffff',
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 0,
  },
  
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  
  clearButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  
  searchButton: {
    padding: 4,
  },
  
  searchButtonDisabled: {
    opacity: 0.5,
  },
  
  searchButtonText: {
    fontSize: 18,
  },
});
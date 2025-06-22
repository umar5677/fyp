// screens/Home.js
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

//import components
import SummaryCard from '../components/SummaryCard';
import MiniGlucoseChart from '../components/MiniGlucoseChart';
import PredictedGlucoseCard from '../components/PredictedGlucoseCard';
import CalorieBurnt from '../components/CalorieBurnt';

const { width } = Dimensions.get('window');

export default function Home() {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const navigation = useNavigation();

  const insets = useSafeAreaInsets();

  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesCount = 2; // number of slides
  const slideWidth = width - 50;

  // Optional: derive index from scrollX
  const currentIndex = useRef(0);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        currentIndex.current = Math.round(offsetX / slideWidth);
      },
    }
  );


  return (
    <View style={{ flex: 1, marginBottom:90, }}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GlucoBites</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notification')}
        >
          <Ionicons name="notifications-outline" size={24} color="#1BAEDF" />
        </TouchableOpacity>
      </View>
      
    
    <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => 'header'}
          style={{paddingTop:10}}
          ListHeaderComponent={
            <>
              <Text style={styles.dateText}>Today ({today})</Text>
              {/* Swipeable section */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={width - 60 + 40}
                decelerationRate="fast"
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={{
                  paddingHorizontal:0,
                  alignItems: 'center',
                  paddingBottom:50,
                }}
              >
                <View style={styles.slide}>
                  <SummaryCard />
                </View>
                <View style={styles.slide}>
                  <PredictedGlucoseCard />
                </View>
              </ScrollView>
              {/* Animated Dots */}
              <View style={styles.dotsContainer}>
                {[...Array(slidesCount)].map((_, index) => {
                  // Animate size of dots based on scroll
                  const inputRange = [
                    (index - 1) * slideWidth,
                    index * slideWidth,
                    (index + 1) * slideWidth,
                  ];

                  const scale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.8, 1.4, 0.8],
                    extrapolate: 'clamp',
                  });

                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.dot,
                        {
                          opacity,
                          transform: [{ scale }],
                        },
                      ]}
                    />
                  );
                })}
              </View>
    
              <MiniGlucoseChart />
              <CalorieBurnt />
            </>
          }
          contentContainerStyle={styles={padding: 16,
          paddingBottom: insets.bottom - 10,}}
        />
  </View>
  );
}

const styles = StyleSheet.create({
    header: {
      height: 100,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      zIndex: 100,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#313F43',
        marginTop:50,
    },
    notificationButton: {
        position: 'absolute',
        right: 20,
        top: 18,
        marginTop:45,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
        marginBottom:90,
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    valueText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1BAEDF',
    },
    viewMore: {
        marginTop: 10,
        alignSelf: 'flex-end',
    },
    viewMoreText: {
        color: '#1BAEDF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    chart: {
        marginTop: 20,
        borderRadius: 16,
    },
    slide: {
        width: width - 60,
        height: 200,
        //marginTop: 50,
        //marginRight: 5,
        //marginLeft:5,
        alignSelf: 'center',
        marginRight: 10, // space between slides
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      //marginTop: 5,
      marginBottom:10,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 5,
      backgroundColor: '#f78161',
      marginHorizontal: 6,
    },
});
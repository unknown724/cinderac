import React, { useEffect } from 'react';
import { router } from "expo-router"
import { View, StyleSheet  } from 'react-native';
import { Image } from 'expo-image';

export default function LoadingScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login")
    }, 2000)

    return () => clearTimeout(timer)
  },[])

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/gif/cyndaquil.gif')}
        style={styles.gif}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  gif: {
    width: 250,
    height: 250,
  },
});

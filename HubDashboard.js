import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, Switch, ScrollView, StyleSheet } from 'react-native';
import { Lock, User, Users } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  Easing 
} from 'react-native-reanimated';

// --- Components ---

const SentryIndicator = ({ isInside }) => {
  return (
    <View className="flex-row items-center space-x-2">
      <View 
        className={`w-3 h-3 rounded-full ${isInside ? 'bg-green-500' : 'bg-red-500'}`} 
        style={{
          shadowColor: isInside ? '#22c55e' : '#ef4444',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
          elevation: 5,
        }}
      />
      <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider">
        {isInside ? 'In Range' : 'Out of Range'}
      </Text>
    </View>
  );
};

const CourtCard = ({ court }) => {
  // Setup pulse animation for pending state
  const animatedStyle = useAnimatedStyle(() => {
    if (court.status === 'pending') {
      return {
        opacity: withRepeat(
          withSequence(
            withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ), 
          -1, 
          true
        ),
      };
    }
    return { opacity: 1 };
  }, [court.status]);

  if (court.status === 'open') {
    return (
      <View className="bg-[#D6FF00] rounded-2xl p-4 flex-1 m-2 h-40 justify-center items-center">
        <Text className="text-black font-extrabold text-2xl tracking-tighter">AVAILABLE</Text>
      </View>
    );
  }

  if (court.status === 'pending') {
    return (
      <Animated.View className="bg-[#ff8a00] rounded-2xl p-4 flex-1 m-2 h-40 justify-between border-2 border-[#ff8a00]" style={animatedStyle}>
        <View className="flex-row justify-between items-start">
          <Text className="text-black font-bold text-lg">Court {court.id}</Text>
          <Lock color="black" size={20} />
        </View>
        <View>
          <Text className="text-black font-extrabold text-xl tracking-tighter">RELEASING IN</Text>
          <Text className="text-black font-extrabold text-3xl">05:00</Text>
        </View>
      </Animated.View>
    );
  }

  // Active status
  return (
    <View className="bg-[#1A1A1B] rounded-2xl p-4 flex-1 m-2 h-40 justify-between border border-[#8B3A3A]">
      <View className="flex-row justify-between items-start">
        <Text className="text-white font-bold text-lg">Court {court.id}</Text>
        <User color="#8B3A3A" size={20} />
      </View>
      <View>
        <Text className="text-gray-400 font-bold text-sm uppercase">In Play</Text>
        <Text className="text-white font-extrabold text-xl" numberOfLines={1}>{court.userName}</Text>
      </View>
    </View>
  );
};

const WaitlistAction = ({ isOnList, queuePosition, onJoinPress }) => {
  if (isOnList) {
    return (
      <View className="bg-[#1A1A1B] border border-gray-800 rounded-3xl p-6 mt-6 items-center flex-row justify-between">
        <View>
          <Text className="text-gray-400 font-bold text-sm uppercase tracking-wider">Waitlist Status</Text>
          <Text className="text-white font-extrabold text-2xl mt-1">You are #{queuePosition} in line</Text>
        </View>
        <Users color="#D6FF00" size={32} />
      </View>
    );
  }

  return (
    <Pressable 
      onPress={onJoinPress}
      className="bg-[#D6FF00] rounded-full p-5 mt-6 items-center shadow-lg shadow-[#D6FF00]/20 min-h-[56px] justify-center"
    >
      <Text className="text-black font-extrabold text-lg uppercase tracking-widest">Join Waitlist</Text>
    </Pressable>
  );
};

// --- Main Screen ---

export default function HubDashboard() {
  const [isInsideHub, setIsInsideHub] = useState(true);
  const [isOnList, setIsOnList] = useState(false);
  const [queuePosition, setQueuePosition] = useState(3);
  const [isEligibleToClaim, setIsEligibleToClaim] = useState(false);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [players, setPlayers] = useState(2);
  const [isPrivate, setIsPrivate] = useState(false);

  // Mock courts data
  const [courts] = useState([
    { id: '1', status: 'active', userName: 'Maria S.' },
    { id: '2', status: 'pending', userName: 'Alex R.' },
    { id: '3', status: 'open', userName: null },
    { id: '4', status: 'active', userName: 'John D.' },
  ]);

  return (
    <View className="flex-1 bg-black px-4 pt-16">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-white font-extrabold text-3xl tracking-tight">Central Park</Text>
          <Text className="text-gray-400 font-bold text-xl tracking-tight">Hub</Text>
        </View>
        <SentryIndicator isInside={isInsideHub} />
      </View>

      {/* Grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex-row flex-wrap justify-between -mx-2">
          {courts.map((c) => (
            <View key={c.id} style={{ width: '50%' }}>
              <CourtCard court={c} />
            </View>
          ))}
        </View>

        {/* Waitlist */}
        <WaitlistAction 
          isOnList={isOnList} 
          queuePosition={queuePosition} 
          onJoinPress={() => setShowJoinSheet(true)} 
        />
        
        {/* Toggle inside/outside to test Claim Modal */}
        <Pressable 
          className="mt-10 p-4 border border-gray-800 rounded-xl"
          onPress={() => setIsInsideHub(!isInsideHub)}
        >
          <Text className="text-gray-400 text-center font-bold">Toggle Sentry Location (Dev)</Text>
        </Pressable>
        <Pressable 
          className="mt-4 p-4 border border-gray-800 rounded-xl"
          onPress={() => setIsEligibleToClaim(!isEligibleToClaim)}
        >
          <Text className="text-gray-400 text-center font-bold">Toggle Claim Eligibility (Dev)</Text>
        </Pressable>
      </ScrollView>

      {/* Claim Modal */}
      <Modal visible={isEligibleToClaim} transparent animationType="slide">
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-[#111] rounded-t-3xl p-6 items-center border-t border-[#333]">
            <Text className="text-[#D6FF00] font-extrabold text-2xl tracking-tight mb-2 uppercase">Your Court is Ready</Text>
            <Text className="text-gray-400 font-bold text-center mb-8">Court 3 is waiting for you.</Text>
            
            {/* Mock Circular Progress */}
            <View className="w-48 h-48 rounded-full border-4 border-[#D6FF00] items-center justify-center mb-8 shadow-xl shadow-[#D6FF00]/20">
              <Text className="text-white font-extrabold text-4xl">03:00</Text>
              <Text className="text-gray-400 font-bold text-sm uppercase mt-2">Remaining</Text>
            </View>

            <Pressable 
              disabled={!isInsideHub}
              className={`w-full rounded-2xl p-5 items-center flex-row justify-center min-h-[60px] ${isInsideHub ? 'bg-[#D6FF00]' : 'bg-gray-800'}`}
              onPress={() => setIsEligibleToClaim(false)}
            >
              {!isInsideHub && <Lock color="#9ca3af" size={20} style={{ marginRight: 8 }} />}
              <Text className={`${isInsideHub ? 'text-black' : 'text-gray-400'} font-extrabold text-xl uppercase tracking-widest`}>
                {isInsideHub ? 'CLAIM COURT' : 'Walk into Hub to Claim'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Join Waitlist Bottom Sheet Modal */}
      <Modal visible={showJoinSheet} transparent animationType="slide">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-[#111] border-t border-gray-800 rounded-t-3xl p-6 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-extrabold text-2xl">Join Waitlist</Text>
              <Pressable onPress={() => setShowJoinSheet(false)} className="p-2 min-h-[48px] min-w-[48px] items-center justify-center">
                <Text className="text-gray-400 font-bold text-lg">✕</Text>
              </Pressable>
            </View>

            <View className="mb-6">
              <Text className="text-gray-400 font-bold mb-4 uppercase text-xs tracking-wider">Players Needed</Text>
              <View className="flex-row justify-between bg-black rounded-2xl p-2 border border-gray-800">
                {[1,2,3,4].map(num => (
                  <Pressable 
                    key={num}
                    onPress={() => setPlayers(num)}
                    className={`flex-1 min-h-[48px] items-center justify-center rounded-xl ${players === num ? 'bg-gray-800' : 'bg-transparent'}`}
                  >
                    <Text className={`font-bold ${players === num ? 'text-white' : 'text-gray-500'}`}>{num}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="flex-row justify-between items-center mb-10 bg-black p-5 rounded-2xl border border-gray-800">
              <View>
                <Text className="text-white font-bold text-lg">Match Type</Text>
                <Text className="text-gray-500 font-bold text-sm mt-1">{isPrivate ? 'Private' : 'Public / Open'}</Text>
              </View>
              <Switch 
                value={isPrivate} 
                onValueChange={setIsPrivate} 
                trackColor={{ false: '#333', true: '#D6FF00' }}
                thumbColor={isPrivate ? '#000' : '#888'}
              />
            </View>

            <Pressable 
              onPress={() => {
                setShowJoinSheet(false);
                setIsOnList(true);
              }}
              className="bg-[#D6FF00] w-full rounded-2xl p-5 items-center min-h-[60px] justify-center"
            >
              <Text className="text-black font-extrabold text-lg uppercase tracking-widest">Confirm & Join</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

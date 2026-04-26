import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, Switch, StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { Lock, MapPin, User, Users, X } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { claimCourt, db, joinWaitlist } from './db';
import { HUB_LAT, HUB_LNG, RADIUS_METERS, useDebugSentry } from './SilentSentry';

const HUB_NAME = 'Central Park Hub';
const MOCK_UID = 'debug-user';
const COURT_MARKER_COLORS = {
  open: '#22c55e',
  active: '#8B3A3A',
  pending: '#ff8a00',
};

const fallbackCourts = [
  { id: '1', status: 'active', userName: 'Maria S.' },
  { id: '2', status: 'pending', userName: 'Alex R.' },
  { id: '3', status: 'open', userName: null },
  { id: '4', status: 'active', userName: 'John D.' },
];

const initialRegion = {
  latitude: HUB_LAT,
  longitude: HUB_LNG,
  latitudeDelta: 0.004,
  longitudeDelta: 0.004,
};

const getCourtCoordinate = (court, index, total) => {
  if (court.latitude && court.longitude) {
    return { latitude: court.latitude, longitude: court.longitude };
  }

  if (court.lat && court.lng) {
    return { latitude: court.lat, longitude: court.lng };
  }

  const angle = (Math.PI * 2 * index) / Math.max(total, 1);
  const offset = 0.00028;
  return {
    latitude: HUB_LAT + Math.sin(angle) * offset,
    longitude: HUB_LNG + Math.cos(angle) * offset,
  };
};

const SentryIndicator = ({ isInside }) => {
  return (
    <View className="flex-row items-center space-x-2">
      <View
        className={`h-3 w-3 rounded-full ${isInside ? 'bg-green-500' : 'bg-red-500'}`}
        style={{
          shadowColor: isInside ? '#22c55e' : '#ef4444',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
          elevation: 5,
        }}
      />
      <Text className="text-xs font-bold uppercase tracking-wider text-gray-400">
        {isInside ? 'In Range' : 'Out of Range'}
      </Text>
    </View>
  );
};

const CourtCard = ({
  court,
  isInside,
  isOnList,
  queuePosition,
  onJoinPress,
  onClaimPress,
  onClose,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (court.status === 'pending') {
      return {
        opacity: withRepeat(
          withSequence(
            withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        ),
      };
    }
    return { opacity: 1 };
  }, [court.status]);

  const isOpen = court.status === 'open';
  const isPending = court.status === 'pending';
  const statusLabel = isOpen ? 'Available' : isPending ? 'Pending Release' : 'In Play';
  const borderColor = isOpen ? '#D6FF00' : isPending ? '#ff8a00' : '#8B3A3A';
  const iconColor = isOpen ? '#D6FF00' : isPending ? '#111' : '#8B3A3A';

  const CardShell = isPending ? Animated.View : View;

  return (
    <CardShell
      className="rounded-2xl border bg-[#111] p-5 shadow-2xl"
      style={isPending ? [animatedStyle, { borderColor }] : { borderColor }}
    >
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Selected Court</Text>
          <Text className="mt-1 text-3xl font-extrabold tracking-tight text-white">Court {court.id}</Text>
        </View>
        <Pressable onPress={onClose} className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/60">
          <X color="#9ca3af" size={22} />
        </Pressable>
      </View>

      <View className={`rounded-xl p-4 ${isOpen ? 'bg-[#D6FF00]' : isPending ? 'bg-[#ff8a00]' : 'bg-black'}`}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className={`${isOpen || isPending ? 'text-black' : 'text-gray-400'} text-xs font-extrabold uppercase tracking-widest`}>
              Status
            </Text>
            <Text className={`${isOpen || isPending ? 'text-black' : 'text-white'} mt-1 text-2xl font-extrabold uppercase tracking-tight`}>
              {statusLabel}
            </Text>
          </View>
          {isOpen ? <MapPin color="black" size={28} /> : isPending ? <Lock color={iconColor} size={28} /> : <User color={iconColor} size={28} />}
        </View>
        {!isOpen && (
          <Text className={`${isPending ? 'text-black' : 'text-gray-300'} mt-3 text-base font-bold`} numberOfLines={1}>
            {isPending ? 'Releasing in 05:00' : court.userName || 'Player active'}
          </Text>
        )}
      </View>

      {isOpen ? (
        <Pressable
          disabled={!isInside}
          onPress={onClaimPress}
          className={`mt-5 min-h-[58px] flex-row items-center justify-center rounded-2xl px-5 ${isInside ? 'bg-[#D6FF00]' : 'bg-gray-800'}`}
        >
          {!isInside && <Lock color="#9ca3af" size={20} style={{ marginRight: 8 }} />}
          <Text className={`${isInside ? 'text-black' : 'text-gray-400'} text-lg font-extrabold uppercase tracking-widest`}>
            {isInside ? 'Claim Court' : 'Walk Into Hub'}
          </Text>
        </Pressable>
      ) : isOnList ? (
        <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-gray-800 bg-black p-4">
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-400">Waitlist Status</Text>
            <Text className="mt-1 text-xl font-extrabold text-white">You are #{queuePosition} in line</Text>
          </View>
          <Users color="#D6FF00" size={30} />
        </View>
      ) : (
        <Pressable
          onPress={onJoinPress}
          className="mt-5 min-h-[58px] items-center justify-center rounded-2xl bg-[#D6FF00] px-5"
        >
          <Text className="text-lg font-extrabold uppercase tracking-widest text-black">Join Waitlist</Text>
        </Pressable>
      )}
    </CardShell>
  );
};

export default function HubDashboard() {
  const { isInside, forceExit } = useDebugSentry();
  const [isOnList, setIsOnList] = useState(false);
  const [queuePosition] = useState(3);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [players, setPlayers] = useState(2);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [liveCourts, setLiveCourts] = useState(fallbackCourts);
  const [hub, setHub] = useState({ name: HUB_NAME, total_courts: fallbackCourts.length });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'courts'),
      (snapshot) => {
        if (snapshot.empty) return;

        const nextCourts = snapshot.docs.map((courtDoc) => ({
          id: courtDoc.id,
          ...courtDoc.data(),
        }));
        setLiveCourts(nextCourts);
      },
      (error) => console.error('Error listening to courts: ', error)
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'hub', 'current'),
      (snapshot) => {
        if (!snapshot.exists()) return;
        setHub((currentHub) => ({ ...currentHub, ...snapshot.data() }));
      },
      (error) => console.error('Error listening to hub: ', error)
    );

    return unsubscribe;
  }, []);

  const activeCount = useMemo(
    () => liveCourts.filter((court) => court.status === 'active' || court.status === 'pending').length,
    [liveCourts]
  );

  const totalCount = hub.total_courts ?? liveCourts.length;
  const hubName = hub.name || HUB_NAME;

  const handleJoinWaitlist = async () => {
    await joinWaitlist(MOCK_UID);
    setIsOnList(true);
    setShowJoinSheet(false);
  };

  const handleClaimCourt = async () => {
    if (!selectedCourt) return;
    await claimCourt(MOCK_UID, isInside, selectedCourt.id);
    setSelectedCourt(null);
  };

  return (
    <View className="flex-1 bg-black">
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={true}
        followsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <Circle
          center={{ latitude: HUB_LAT, longitude: HUB_LNG }}
          radius={RADIUS_METERS}
          fillColor="#D6FF0022"
          strokeColor="#D6FF00"
          strokeWidth={2}
        />

        {liveCourts.map((court, index) => {
          const coordinate = getCourtCoordinate(court, index, liveCourts.length);
          return (
            <Marker
              key={court.id}
              coordinate={coordinate}
              pinColor={COURT_MARKER_COLORS[court.status] || COURT_MARKER_COLORS.open}
              title={`Court ${court.id}`}
              description={(court.status || 'open').toUpperCase()}
              onPress={() => setSelectedCourt(court)}
            />
          );
        })}
      </MapView>

      <View className="absolute left-4 right-4 top-12">
        <View className="rounded-2xl border border-[#D6FF00]/70 bg-black/90 p-4 shadow-xl">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-xs font-extrabold uppercase tracking-widest text-[#D6FF00]">Live Hub</Text>
              <Text className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-white">{hubName}</Text>
              <Text className="mt-2 text-sm font-bold uppercase tracking-wider text-gray-300">
                {activeCount} / {totalCount} Courts In Use
              </Text>
            </View>
            <SentryIndicator isInside={isInside} />
          </View>
        </View>

        {!isInside && (
          <View className="mt-3 rounded-xl bg-red-600 p-3">
            <Text className="text-center text-sm font-extrabold uppercase tracking-wider text-white">
              Outside Hub: Return Within 10 Mins To Save Your Court
            </Text>
          </View>
        )}
      </View>

      {selectedCourt && (
        <View className="absolute bottom-8 left-4 right-4">
          <CourtCard
            court={selectedCourt}
            isInside={isInside}
            isOnList={isOnList}
            queuePosition={queuePosition}
            onJoinPress={() => setShowJoinSheet(true)}
            onClaimPress={handleClaimCourt}
            onClose={() => setSelectedCourt(null)}
          />
        </View>
      )}

      <Pressable
        className={`absolute right-4 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-gray-800 bg-black/80 ${selectedCourt ? 'bottom-80' : 'bottom-8'}`}
        onPress={forceExit}
      >
        <Text className="text-xs font-extrabold uppercase text-gray-400">Dev</Text>
      </Pressable>

      <Modal visible={showJoinSheet} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/80">
          <View className="rounded-t-3xl border-t border-gray-800 bg-[#111] p-6 pb-12">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-2xl font-extrabold uppercase text-white">Join Waitlist</Text>
              <Pressable onPress={() => setShowJoinSheet(false)} className="min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-black">
                <X color="#9ca3af" size={22} />
              </Pressable>
            </View>

            <View className="mb-6">
              <Text className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Players Needed</Text>
              <View className="flex-row justify-between rounded-2xl border border-gray-800 bg-black p-2">
                {[1, 2, 3, 4].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => setPlayers(num)}
                    className={`min-h-[48px] flex-1 items-center justify-center rounded-xl ${players === num ? 'bg-gray-800' : 'bg-transparent'}`}
                  >
                    <Text className={`font-bold ${players === num ? 'text-white' : 'text-gray-500'}`}>{num}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="mb-10 flex-row items-center justify-between rounded-2xl border border-gray-800 bg-black p-5">
              <View>
                <Text className="text-lg font-bold text-white">Match Type</Text>
                <Text className="mt-1 text-sm font-bold text-gray-500">{isPrivate ? 'Private' : 'Public / Open'}</Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: '#333', true: '#D6FF00' }}
                thumbColor={isPrivate ? '#000' : '#888'}
              />
            </View>

            <Pressable
              onPress={handleJoinWaitlist}
              className="min-h-[60px] w-full items-center justify-center rounded-2xl bg-[#D6FF00] p-5"
            >
              <Text className="text-lg font-extrabold uppercase tracking-widest text-black">Confirm & Join</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

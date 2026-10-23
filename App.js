import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Dimensions,
  Easing,
} from 'react-native';
import * as Location from 'expo-location';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Configurações e Temas ---
const CONFIG = {
  FONTS: {
    REGULAR: 'Pretendard-Regular',
    LIGHT: 'Pretendard-Light',
    URLS: {
      'Pretendard-Regular':
        'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/fonts/Pretendard-Regular.otf',
      'Pretendard-Light':
        'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/fonts/Pretendard-Light.otf',
    },
  },
  API_WEATHER: 'https://api.open-meteo.com/v1/forecast',
  API_AQI: 'https://air-quality-api.open-meteo.com/v1/air-quality',
};

const THEMES = {
  dark: {
    BACKGROUND: '#1A1A1C',
    SURFACE: '#242426',
    SURFACE_ALT: '#2D2D30',
    TEXT_PRIMARY: '#E4E4E6',
    TEXT_SECONDARY: '#9A9A9E',
    ICON: '#C4C4C8',
    ERROR: '#D97777',
    WARN: '#D9B377',
    RAIN_BAR: '#5E81AC',
    RAIN_PARTICLE: 'rgba(164, 190, 220, 0.4)',
  },
  light: {
    BACKGROUND: '#F4F4F6',
    SURFACE: '#EAEAEB',
    SURFACE_ALT: '#DCDCDF',
    TEXT_PRIMARY: '#2C2C2E',
    TEXT_SECONDARY: '#8E8E93',
    ICON: '#6C6C70',
    ERROR: '#CC3333',
    WARN: '#CC8833',
    RAIN_BAR: '#4C78A8',
    RAIN_PARTICLE: 'rgba(76, 120, 168, 0.35)',
  },
};

const I18N = {
  pt: {
    loading: 'A obter dados...',
    today: 'Hoje',
    tomorrow: 'Amanhã',
    days: [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ],
    intro: 'O clima hoje está',
    willBe: 'Estará',
    feelsLike: 'Sensação',
    sunrise: 'Nascer',
    sunset: 'Pôr',
    uvIndex: 'Índice UV',
    aqi: 'AQI',
    offline: 'Última atualização',
    settings: 'Configurações',
    language: 'Idioma',
    units: 'Unidade',
    theme: 'Tema',
    rainPrecision: 'Chuva ao longo do dia',
    peakAt: 'Pico de precipitação às',
    noRainDay: 'Sem probabilidade de chuva expressiva',
    rainProbability: 'Probabilidade',
    rainVolume: 'Volume estimado',
    moods: {
      cold: 'FRIO',
      cool: 'FRESCO',
      pleasant: 'AGRADÁVEL',
      warm: 'QUENTE',
    },
    wmo: {
      0: 'céu limpo',
      1: 'quase limpo',
      2: 'parcialmente nublado',
      3: 'encoberto',
      45: 'com nevoeiro',
      61: 'com chuva fraca',
      63: 'com chuva moderada',
      65: 'com chuva forte',
      80: 'pancadas de chuva',
      95: 'com trovoada',
    },
  },
  en: {
    loading: 'Fetching data...',
    today: 'Today',
    tomorrow: 'Tomorrow',
    days: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    intro: "Today's weather is",
    willBe: 'It will be',
    feelsLike: 'Feels like',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    uvIndex: 'UV Index',
    aqi: 'AQI',
    offline: 'Last updated',
    settings: 'Settings',
    language: 'Language',
    units: 'Units',
    theme: 'Theme',
    rainPrecision: '24h Rain forecast',
    peakAt: 'Rain peak expected at',
    noRainDay: 'No significant rain expected',
    rainProbability: 'Chance',
    rainVolume: 'Estimated volume',
    moods: { cold: 'COLD', cool: 'COOL', pleasant: 'PLEASANT', warm: 'WARM' },
    wmo: {
      0: 'clear sky',
      1: 'mostly clear',
      2: 'partly cloudy',
      3: 'overcast',
      45: 'foggy',
      61: 'light rain',
      63: 'moderate rain',
      65: 'heavy rain',
      80: 'rain showers',
      95: 'thunderstorms',
    },
  },
};

const WMO_ICONS = {
  0: 'sun',
  1: 'sun',
  2: 'cloud',
  3: 'cloud',
  45: 'wind',
  61: 'cloud-rain',
  63: 'cloud-rain',
  65: 'cloud-rain',
  80: 'cloud-rain',
  95: 'cloud-lightning',
};

// --- Efeito de Chuva Caindo na Tela ---
const RAIN_DROPS = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  x: Math.random() * SCREEN_WIDTH,
  delay: Math.random() * 2000,
  duration: 800 + Math.random() * 500,
  height: 12 + Math.random() * 10,
}));

const ScreenRainEffect = ({ active, color }) => {
  const animatedValues = useRef(
    RAIN_DROPS.map(() => new Animated.Value(-30))
  ).current;

  useEffect(() => {
    if (!active) return;

    const animations = RAIN_DROPS.map((drop, index) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(drop.delay),
          Animated.timing(animatedValues[index], {
            toValue: SCREEN_HEIGHT + 20,
            duration: drop.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return anim;
    });

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {RAIN_DROPS.map((drop, i) => (
        <Animated.View
          key={drop.id}
          style={[
            stylesRain.drop,
            {
              left: drop.x,
              height: drop.height,
              backgroundColor: color,
              transform: [{ translateY: animatedValues[i] }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const stylesRain = StyleSheet.create({
  drop: {
    position: 'absolute',
    width: 1.2,
    borderRadius: 1,
    opacity: 0.8,
  },
});

// --- Ícone com Animação Minimalista e Suave ---
const AnimatedIcon = ({ name, size = 20, color, style }) => {
  const spinVal = useRef(new Animated.Value(0)).current;
  const pulseVal = useRef(new Animated.Value(1)).current;
  const loopMoveVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Sol girando suave e contínuo
    if (name === 'sun') {
      const spin = Animated.loop(
        Animated.timing(spinVal, {
          toValue: 1,
          duration: 22000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    }

    // 2. Raio piscando devagar e com sutileza
    if (name === 'cloud-lightning') {
      const flash = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseVal, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseVal, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(pulseVal, {
            toValue: 0.4,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(pulseVal, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(2200),
        ])
      );
      flash.start();
      return () => flash.stop();
    }

    // 3. Nuvem / Neblina / Vento com movimento contínuo em loop frente e trás
    if (name === 'wind' || name === 'cloud') {
      const moveLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(loopMoveVal, {
            toValue: 5,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(loopMoveVal, {
            toValue: -5,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      moveLoop.start();
      return () => moveLoop.stop();
    }
  }, [name]);

  const spinInterpolation = spinVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const animatedStyles = {
    ...(name === 'sun' && { transform: [{ rotate: spinInterpolation }] }),
    ...(name === 'cloud-lightning' && { opacity: pulseVal }),
    ...((name === 'wind' || name === 'cloud') && {
      transform: [{ translateX: loopMoveVal }],
    }),
  };

  return (
    <Animated.View style={[style, animatedStyles]}>
      <Feather name={name} size={size} color={color} />
    </Animated.View>
  );
};

export default function App() {
  const [appState, setAppState] = useState({
    isLoading: true,
    error: null,
    data: null,
  });
  const [settings, setSettings] = useState({
    lang: 'pt',
    unit: 'metric',
    theme: 'dark',
  });
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currentTheme = THEMES[settings.theme];
  const t = I18N[settings.lang];
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  useEffect(() => {
    async function init() {
      try {
        await Font.loadAsync(CONFIG.FONTS.URLS);
      } catch (e) { }
      const savedSettings = await AsyncStorage.getItem('@settings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));
      const cached = await AsyncStorage.getItem('@weather_cache');
      if (cached) {
        setAppState({
          isLoading: false,
          error: null,
          data: JSON.parse(cached),
        });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }
      setIsInitialized(true);
    }
    init();
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setAppState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Permissão negada');

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lon } = loc.coords;

      const unitQuery =
        settings.unit === 'imperial' ? '&temperature_unit=fahrenheit' : '';

      const weatherUrl = `${CONFIG.API_WEATHER}?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto${unitQuery}`;
      const aqiUrl = `${CONFIG.API_AQI}?latitude=${lat}&longitude=${lon}&current=european_aqi`;

      const [resW, resA] = await Promise.all([
        fetch(weatherUrl),
        fetch(aqiUrl).catch(() => null),
      ]);
      const dataW = await resW.json();
      const dataA = resA ? await resA.json() : null;

      const newData = {
        current: dataW.current,
        daily: dataW.daily,
        hourly: dataW.hourly,
        aqi: dataA?.current?.european_aqi,
        updatedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setAppState({ isLoading: false, error: null, data: newData });
      await AsyncStorage.setItem('@weather_cache', JSON.stringify(newData));
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      setAppState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
    }
  };

  useEffect(() => {
    if (isInitialized) fetchData(appState.data !== null);
  }, [isInitialized, settings.unit]);

  if (!isInitialized) return null;

  const updateSetting = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await AsyncStorage.setItem('@settings', JSON.stringify(next));
  };

  const getMood = (temp) => {
    const tempC = settings.unit === 'imperial' ? (temp - 32) * (5 / 9) : temp;
    if (tempC < 10) return t.moods.cold;
    if (tempC < 20) return t.moods.cool;
    if (tempC < 28) return t.moods.pleasant;
    return t.moods.warm;
  };

  const formatTime = (iso) =>
    iso ? iso.split('T')[1].substring(0, 5) : '--:--';

  const getSelectedDayRainData = () => {
    if (!appState.data?.hourly || !appState.data?.daily?.time) return null;
    const selectedDate = appState.data.daily.time[selectedDayIndex];

    const dayHours = [];
    let maxRainProb = 0;
    let peakHour = null;

    appState.data.hourly.time.forEach((timeStr, idx) => {
      if (timeStr.startsWith(selectedDate)) {
        const prob = appState.data.hourly.precipitation_probability[idx] || 0;
        const precip = appState.data.hourly.precipitation[idx] || 0;
        const temp = appState.data.hourly.temperature_2m[idx];
        const code = appState.data.hourly.weather_code[idx];
        const hour = timeStr.split('T')[1].substring(0, 5);

        if (prob > maxRainProb) {
          maxRainProb = prob;
          peakHour = hour;
        }

        dayHours.push({
          hour,
          prob,
          precip,
          temp,
          code,
        });
      }
    });

    return { dayHours, maxRainProb, peakHour };
  };

  const rainDetails = getSelectedDayRainData();

  const isCurrentlyRaining = [61, 63, 65, 80, 95].includes(
    appState.data?.current?.weather_code
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={settings.theme === 'dark' ? 'light-content' : 'dark-content'}
      />

      <ScreenRainEffect
        active={isCurrentlyRaining}
        color={currentTheme.RAIN_PARTICLE}
      />

      {appState.isLoading && !appState.data ? (
        <View style={styles.center}>
          <ActivityIndicator color={currentTheme.TEXT_SECONDARY} />
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={appState.isLoading}
              onRefresh={fetchData}
              tintColor={currentTheme.TEXT_SECONDARY}
            />
          }>
          <View style={styles.header}>
            <Text style={styles.updatedText}>
              {t.offline}: {appState.data.updatedAt}
            </Text>
            <TouchableOpacity
              onPress={() => setIsSettingsOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather
                name="settings"
                size={16}
                color={currentTheme.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </View>

          {appState.data && (
            <>
              <View style={styles.currentSection}>
                <Text style={styles.introText}>{t.intro}</Text>
                <Text style={styles.moodText}>
                  {getMood(appState.data.current.temperature_2m)}
                </Text>

                <View style={styles.tempRow}>
                  <View>
                    <Text style={styles.tempText}>
                      {Math.round(appState.data.current.temperature_2m)}°
                    </Text>
                    <Text style={styles.feelsLikeText}>
                      {t.feelsLike}{' '}
                      {Math.round(appState.data.current.apparent_temperature)}°
                    </Text>
                  </View>
                  <AnimatedIcon
                    name={
                      WMO_ICONS[appState.data.current.weather_code] || 'sun'
                    }
                    size={38}
                    color={currentTheme.ICON}
                  />
                </View>
                <Text style={styles.descText}>
                  {t.willBe}{' '}
                  {t.wmo[appState.data.current.weather_code] || t.wmo[0]}.
                </Text>
              </View>

              {/* Indicadores Principais */}
              <View style={styles.indicatorGrid}>
                <View style={styles.indicatorBox}>
                  <Feather name="sunrise" size={14} color={currentTheme.ICON} />
                  <Text style={styles.indicatorVal}>
                    {formatTime(appState.data.daily.sunrise[0])}
                  </Text>
                  <Text style={styles.indicatorLab}>{t.sunrise}</Text>
                </View>
                <View style={styles.indicatorBox}>
                  <Feather name="sunset" size={14} color={currentTheme.ICON} />
                  <Text style={styles.indicatorVal}>
                    {formatTime(appState.data.daily.sunset[0])}
                  </Text>
                  <Text style={styles.indicatorLab}>{t.sunset}</Text>
                </View>
                <View style={styles.indicatorBox}>
                  <AnimatedIcon
                    name="sun"
                    size={14}
                    color={
                      appState.data.daily.uv_index_max[0] > 7
                        ? currentTheme.WARN
                        : currentTheme.ICON
                    }
                  />
                  <Text
                    style={[
                      styles.indicatorVal,
                      appState.data.daily.uv_index_max[0] > 7 && {
                        color: currentTheme.WARN,
                      },
                    ]}>
                    {appState.data.daily.uv_index_max[0].toFixed(1)}
                  </Text>
                  <Text style={styles.indicatorLab}>{t.uvIndex}</Text>
                </View>
                <View style={styles.indicatorBox}>
                  <AnimatedIcon
                    name="wind"
                    size={14}
                    color={
                      appState.data.aqi > 50
                        ? currentTheme.WARN
                        : currentTheme.ICON
                    }
                  />
                  <Text
                    style={[
                      styles.indicatorVal,
                      appState.data.aqi > 50 && { color: currentTheme.WARN },
                    ]}>
                    {appState.data.aqi || '--'}
                  </Text>
                  <Text style={styles.indicatorLab}>{t.aqi}</Text>
                </View>
              </View>

              {/* Lista dos Dias com seleção interativa (Sem porcentagem) */}
              <View style={styles.forecastSection}>
                {appState.data.daily.time.slice(0, 5).map((date, index) => {
                  const isSelected = selectedDayIndex === index;

                  return (
                    <TouchableOpacity
                      key={date}
                      activeOpacity={0.7}
                      onPress={() => setSelectedDayIndex(index)}
                      style={[
                        styles.forecastRow,
                        isSelected && styles.forecastRowSelected,
                      ]}>
                      <Text
                        style={[
                          styles.forecastDay,
                          isSelected && styles.forecastDaySelected,
                        ]}>
                        {index === 0
                          ? t.today
                          : index === 1
                            ? t.tomorrow
                            : t.days[new Date(date + 'T12:00:00').getDay()]}
                      </Text>
                      <View style={styles.forecastRight}>
                        <AnimatedIcon
                          name={
                            WMO_ICONS[
                            appState.data.daily.weather_code[index]
                            ] || 'sun'
                          }
                          size={16}
                          color={
                            isSelected
                              ? currentTheme.TEXT_PRIMARY
                              : currentTheme.ICON
                          }
                          style={styles.forecastIcon}
                        />
                        <Text style={styles.forecastTemp}>
                          {Math.round(
                            appState.data.daily.temperature_2m_min[index]
                          )}
                          ° /{' '}
                          {Math.round(
                            appState.data.daily.temperature_2m_max[index]
                          )}
                          °
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Linha do Tempo e Gráfico de Chuva 24h Mais Gordinho */}
              {rainDetails && (
                <View style={styles.rainTimelineCard}>
                  <View style={styles.rainTimelineHeader}>
                    <Text style={styles.rainTimelineTitle}>
                      {t.rainPrecision} (
                      {selectedDayIndex === 0
                        ? t.today
                        : selectedDayIndex === 1
                          ? t.tomorrow
                          : t.days[
                          new Date(
                            appState.data.daily.time[selectedDayIndex] +
                            'T12:00:00'
                          ).getDay()
                          ]}
                      )
                    </Text>
                    <Text style={styles.rainTimelineSummary}>
                      {rainDetails.maxRainProb > 10
                        ? `${t.peakAt} ${rainDetails.peakHour} (${rainDetails.maxRainProb}%)`
                        : t.noRainDay}
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hourlyScroll}>
                    {rainDetails.dayHours.map((item, idx) => (
                      <View key={idx} style={styles.hourlyItem}>
                        <Text style={styles.hourlyHour}>{item.hour}</Text>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max(item.prob, 8)}%`,
                                backgroundColor:
                                  item.prob > 40
                                    ? currentTheme.RAIN_BAR
                                    : currentTheme.SURFACE_ALT,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.hourlyProbText,
                            item.prob > 40 && { color: currentTheme.TEXT_PRIMARY },
                          ]}>
                          {item.prob > 0 ? `${item.prob}%` : '·'}
                        </Text>
                        <Text style={styles.hourlyTempText}>
                          {Math.round(item.temp)}°
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}


            </>
          )}
        </Animated.ScrollView>
      )}

      {/* Modal de Configurações */}
      <Modal visible={isSettingsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t.settings}</Text>
            <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
              <Feather name="x" size={24} color={currentTheme.ICON} />
            </TouchableOpacity>
          </View>
          <SettingRow
            label={t.language}
            active={settings.lang}
            opts={['pt', 'en']}
            onSelect={(v) => updateSetting('lang', v)}
            styles={styles}
          />
          <SettingRow
            label={t.units}
            active={settings.unit}
            opts={['metric', 'imperial']}
            onSelect={(v) => updateSetting('unit', v)}
            styles={styles}
          />
          <SettingRow
            label={t.theme}
            active={settings.theme}
            opts={['light', 'dark']}
            onSelect={(v) => updateSetting('theme', v)}
            styles={styles}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SettingRow = ({ label, active, opts, onSelect, styles }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <View style={styles.toggleGroup}>
      {opts.map((o) => (
        <TouchableOpacity
          key={o}
          style={[styles.toggleBtn, active === o && styles.toggleBtnActive]}
          onPress={() => onSelect(o)}>
          <Text
            style={[
              styles.toggleText,
              active === o && styles.toggleTextActive,
            ]}>
            {o.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const createStyles = (theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.BACKGROUND },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 24, paddingVertical: 80, },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 40,
    },
    brandText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 14,
      color: theme.TEXT_SECONDARY,
      letterSpacing: 1,
    },
    currentSection: { marginBottom: 32 },
    introText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 16,
      color: theme.TEXT_PRIMARY,
      marginBottom: 4,
    },
    moodText: {
      fontFamily: CONFIG.FONTS.REGULAR,
      fontSize: 16,
      color: theme.TEXT_SECONDARY,
      letterSpacing: 2,
      marginBottom: 20,
      textTransform: 'uppercase',
    },
    tempRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
      marginBottom: 16,
    },
    tempText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 48,
      color: theme.TEXT_PRIMARY,
    },
    feelsLikeText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 14,
      color: theme.TEXT_SECONDARY,
      marginTop: -4,
    },
    descText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 14,
      color: theme.TEXT_SECONDARY,
    },

    // Grid de Indicadores
    indicatorGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: theme.SURFACE,
      borderRadius: 16,
      padding: 16,
      marginBottom: 32,
    },
    indicatorBox: { alignItems: 'center', flex: 1 },
    indicatorVal: {
      fontFamily: CONFIG.FONTS.REGULAR,
      fontSize: 13,
      color: theme.TEXT_PRIMARY,
      marginTop: 8,
    },
    indicatorLab: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 9,
      color: theme.TEXT_SECONDARY,
      textTransform: 'uppercase',
      marginTop: 2,
    },

    // Previsão 5 dias
    forecastSection: {
      borderTopWidth: 1,
      borderTopColor: theme.SURFACE,
      paddingTop: 12,
      marginBottom: 20,
    },
    forecastRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    forecastRowSelected: {
      backgroundColor: theme.SURFACE,
    },
    forecastDay: {
      fontFamily: CONFIG.FONTS.REGULAR,
      fontSize: 14,
      color: theme.TEXT_SECONDARY,
      width: 90,
    },
    forecastDaySelected: {
      color: theme.TEXT_PRIMARY,
      fontFamily: CONFIG.FONTS.REGULAR,
    },
    forecastRight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flex: 1,
      gap: 16,
    },
    forecastIcon: {
      opacity: 0.8,
    },
    forecastTemp: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 14,
      color: theme.TEXT_PRIMARY,
      width: 75,
      textAlign: 'right',
    },

    // Régua de 24 horas de chuva (Barras mais gordinhas)
    rainTimelineCard: {
      backgroundColor: theme.SURFACE,
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      marginBottom: 24,
    },
    rainTimelineHeader: {
      marginBottom: 16,
    },
    rainTimelineTitle: {
      fontFamily: CONFIG.FONTS.REGULAR,
      fontSize: 13,
      color: theme.TEXT_PRIMARY,
      marginBottom: 4,
    },
    rainTimelineSummary: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 11,
      color: theme.TEXT_SECONDARY,
    },
    hourlyScroll: {
      paddingVertical: 6,
      gap: 14,
    },
    hourlyItem: {
      alignItems: 'center',
      width: 42,
    },
    hourlyHour: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 10,
      color: theme.TEXT_SECONDARY,
      marginBottom: 8,
    },
    barContainer: {
      height: 48,
      width: 20, // Aumentado para ficar mais gordinho
      backgroundColor: theme.SURFACE_ALT,
      borderRadius: 5,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      marginBottom: 8,
    },
    barFill: {
      width: '100%',
      borderRadius: 5,
    },
    hourlyProbText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 10,
      color: theme.TEXT_SECONDARY,
      marginBottom: 4,
    },
    hourlyTempText: {
      fontFamily: CONFIG.FONTS.REGULAR,
      fontSize: 11,
      color: theme.TEXT_PRIMARY,
    },

    updatedText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 10,
      color: theme.TEXT_SECONDARY,
      textAlign: 'center',
      marginTop: 20,
    },

    modalOverlay: { flex: 1, backgroundColor: theme.BACKGROUND, padding: 24 },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 40,
    },
    modalTitle: {
      fontFamily: CONFIG.FONTS.REGULAR,
      fontSize: 18,
      color: theme.TEXT_PRIMARY,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.SURFACE,
    },
    settingLabel: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 16,
      color: theme.TEXT_PRIMARY,
    },
    toggleGroup: {
      flexDirection: 'row',
      backgroundColor: theme.SURFACE,
      borderRadius: 8,
      padding: 4,
    },
    toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    toggleBtnActive: { backgroundColor: theme.BACKGROUND },
    toggleText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 12,
      color: theme.TEXT_SECONDARY,
    },
    toggleTextActive: {
      fontFamily: CONFIG.FONTS.REGULAR,
      color: theme.TEXT_PRIMARY,
    },
  });
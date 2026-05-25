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
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    TEXT_PRIMARY: '#E4E4E6',
    TEXT_SECONDARY: '#9A9A9E',
    ICON: '#C4C4C8',
    ERROR: '#D97777',
    WARN: '#D9B377',
  },
  light: {
    BACKGROUND: '#F4F4F6',
    SURFACE: '#EAEAEB',
    TEXT_PRIMARY: '#2C2C2E',
    TEXT_SECONDARY: '#8E8E93',
    ICON: '#6C6C70',
    ERROR: '#CC3333',
    WARN: '#CC8833',
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
    metric: 'Métrico',
    imperial: 'Imperial',
    light: 'Claro',
    dark: 'Escuro',
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
    metric: 'Metric',
    imperial: 'Imperial',
    light: 'Light',
    dark: 'Dark',
    moods: { cold: 'COLD', cool: 'COOL', pleasant: 'PLEASANT', warm: 'WARM' },
    wmo: {
      0: 'clear sky',
      1: 'mostly clear',
      2: 'partly cloudy',
      3: 'overcast',
      45: 'foggy',
      61: 'light rain',
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
  95: 'cloud-lightning',
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
      } catch (e) {}
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
      if (status !== 'granted') throw new Error(t.errorLoc);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lon } = loc.coords;

      const unitQuery =
        settings.unit === 'imperial' ? '&temperature_unit=fahrenheit' : '';
      // Nova query solicitando apparent_temperature, uv_index e sunrise/sunset
      const weatherUrl = `${CONFIG.API_WEATHER}?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto${unitQuery}`;
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={settings.theme === 'dark' ? 'light-content' : 'dark-content'}
      />

      {appState.isLoading && !appState.data ? (
        <View style={styles.center}>
          <ActivityIndicator color={currentTheme.TEXT_SECONDARY} />
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={appState.isLoading}
              onRefresh={fetchData}
              tintColor={currentTheme.TEXT_SECONDARY}
            />
          }>
          <View style={styles.header}>
            <Text style={styles.brandText}>Weather Minimal</Text>
            <TouchableOpacity onPress={() => setIsSettingsOpen(true)}>
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
                  <Feather
                    name={
                      WMO_ICONS[appState.data.current.weather_code] || 'sun'
                    }
                    size={32}
                    color={currentTheme.ICON}
                  />
                </View>
                <Text style={styles.descText}>
                  {t.willBe}{' '}
                  {t.wmo[appState.data.current.weather_code] || t.wmo[0]}.
                </Text>
              </View>

              {/* Novos Indicadores Minimalistas */}
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
                  <Feather
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
                  <Feather
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

              <View style={styles.forecastSection}>
                {appState.data.daily.time.slice(0, 5).map((date, index) => (
                  <View key={date} style={styles.forecastRow}>
                    <Text style={styles.forecastDay}>
                      {index === 0
                        ? t.today
                        : index === 1
                        ? t.tomorrow
                        : t.days[new Date(date).getDay()]}
                    </Text>
                    <View style={styles.forecastRight}>
                      {appState.data.daily.precipitation_probability_max[
                        index
                      ] > 0 && (
                        <Text style={styles.rainText}>
                          {
                            appState.data.daily.precipitation_probability_max[
                              index
                            ]
                          }
                          %
                        </Text>
                      )}
                      <Feather
                        name={
                          WMO_ICONS[appState.data.daily.weather_code[index]] ||
                          'sun'
                        }
                        size={16}
                        color={currentTheme.ICON}
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
                  </View>
                ))}
              </View>

              <Text style={styles.updatedText}>
                {t.offline}: {appState.data.updatedAt}
              </Text>
            </>
          )}
        </Animated.ScrollView>
      )}

      {/* Modal de Configurações Mantido */}
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
    safeArea: { flex: 1, backgroundColor: theme.BACKGROUND, padding: 24 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 60,
    },
    brandText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 14,
      color: theme.TEXT_SECONDARY,
      letterSpacing: 1,
    },
    currentSection: { marginBottom: 40 },
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
      marginBottom: 24,
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
      marginTop: -5,
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
      marginBottom: 40,
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
    forecastIcon: {
      left: 12,
      opacity: 0.4,
    },
    forecastSection: {
      borderTopWidth: 1,
      borderTopColor: theme.SURFACE,
      paddingTop: 24,
    },
    forecastRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    forecastDay: {
      fontFamily: CONFIG.FONTS.REGULAR,
      fontSize: 14,
      color: theme.TEXT_PRIMARY,
      width: 90,
    },
    forecastRight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flex: 1,
    },
    forecastTemp: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 14,
      color: theme.TEXT_PRIMARY,
      width: 80,
      textAlign: 'right',
    },
    rainText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 12,
      color: theme.TEXT_SECONDARY,
    },
    updatedText: {
      fontFamily: CONFIG.FONTS.LIGHT,
      fontSize: 10,
      color: theme.TEXT_SECONDARY,
      textAlign: 'center',
      marginTop: 40,
    },

    modalOverlay: { flex: 1, backgroundColor: theme.BACKGROUND, padding: 24 },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 40,
      paddingHorizontal: 24,
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
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.SURFACE,
      padding: 24,
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

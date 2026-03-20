// utils/tokenStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getToken = () => AsyncStorage.getItem("token");
export const setToken = (t: string) => AsyncStorage.setItem("token", t);
export const removeToken = () => AsyncStorage.removeItem("token");

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default decodeToken = async () => {
  const dataToken = await AsyncStorage.getItem("token");
  const { data, config } = await axios.get(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/decodeToken`,
    { params: { token: dataToken } },
  );

  return { data, config };
};

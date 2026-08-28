import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default decodeToken = async () => {
  const dataToken = await AsyncStorage.getItem("token");
  const { data, config } = await axios.get(
    `https://lip-balance-analyze-extends.trycloudflare.com/decodeToken`,
    { params: { token: dataToken } },
  );

  return { data, config };
};
























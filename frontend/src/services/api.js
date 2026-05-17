import axios from "axios";

const API_URL = "http://localhost:8000"; // tu backend FastAPI

export const getDesercionPorFacultad = async () => {
  const res = await axios.get(`${API_URL}/desercion_por_facultad`);
  return res.data;
};

export const readLocalData = (key: string, fallback: any) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Dados locais inválidos em ${key}; usando dados de teste.`, error);
    return fallback;
  }
};

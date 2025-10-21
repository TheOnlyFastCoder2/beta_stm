import axios from 'axios';


export const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json; charset=UTF-8',
  
};

export const config = {
  headers: {
    ...headers,
  },
};

export const instance = axios.create({
  timeout: 3000,
  baseURL: 'https://pokeapi.co/api/v2/',
  ...config,
});



export const serializeParams = (params: object) => {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
};

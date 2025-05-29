import { RowDataPacket } from "mysql2/index";

export interface IComment {
  id: string;
  name: string;
  email: string;
  body: string;
  productId: string;
}

export interface IProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  comments?: IComment[];
  images?: IProductImage[];
  thumbnail?: IProductImage;
}

export interface IProductImage {
  id: string;
  productId: string;
  url: string;
  main: boolean;
}

export interface IProductFilterPayload {
  title?: string;
  description?: string;
  priceFrom?: number;
  priceTo?: number;
}

export interface IAuthRequisites {
  username: string;
  password: string;
}
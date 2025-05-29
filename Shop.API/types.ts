import { RowDataPacket } from "mysql2/index";
import {IProduct, IComment, IProductImage, IProductFilterPayload} from "@Shared/types"
import { IAuthRequisites } from "@Shared/types";

 


export type CommentCreatePayload = Omit<IComment, "id">;

export type CommentValidator = (comment: CommentCreatePayload) => string | null;

export interface ICommentEntity extends RowDataPacket {
  comment_id: string;
  name: string;
  email: string;
  body: string;
  product_id: string;
}


export interface IProductEntity extends IProduct, RowDataPacket {
  product_id: string;
}

export interface IProductSearchFilter extends IProductFilterPayload {}

export type ProductCreatePayload = Omit<IProduct, "id" | "comments">;


export interface IImageEntity extends RowDataPacket {
  image_id: string;
  url: string;
  product_id: string;
  main: boolean
}

export type ImageCreatePayload = Omit<IProductImage, "id" | "productId">

export interface ImageAddPayload {
  productId: string;
  images: ImageCreatePayload[]
}

export type ImageRemovePayload = string[]

export interface IUserRequisitesEntity extends IAuthRequisites, RowDataPacket {
  id: number;
} 
import { ICommentEntity, IProductEntity, IImageEntity } from "../../types";

import { IComment, IProduct, IProductImage } from "@Shared/types";

export const mapCommentEntity = ({
  comment_id,
  product_id,
  ...rest
}: ICommentEntity): IComment => {
  return {
    id: comment_id,
    productId: product_id,
    ...rest,
  };
};

export const mapCommentsEntity = (data: ICommentEntity[]): IComment[] => {
  return data.map(mapCommentEntity);
};

export const mapProductsEntity = (data: IProductEntity[]): IProduct[] => {
  return data.map(({ product_id, title, description, price }) => ({
    id: product_id,
    title: title || "",
    description: description || "",
    price: Number(price) || 0,
  }));
};

/* export const mapImages = ({
  image_id,
  url,
  product_id,
  main,
}: IImageEntity): IProductImage => {
  return {
    id: image_id,
    productId: product_id,
    url: url,
    main: Boolean(main),
  };
}; */

export const mapImages = ({
  image_id, product_id, url, main
}: IImageEntity): IProductImage => {
  return {
    id: image_id,
    productId: product_id,
    main: Boolean(main),
    url
  }
}

export const mapImagesEntity = (data: IImageEntity[]): IProductImage[] => {
  return data.map(mapImages);
};

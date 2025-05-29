import {
  ICommentEntity,
  IProductSearchFilter,
  IImageEntity,
} from "../../types";
import { IComment, IProduct, IProductImage } from "@Shared/types";

import { mapCommentEntity, mapImages } from "./mapping";
import { CommentValidator, CommentCreatePayload } from "../../types";

//-----------

export const validateComment: CommentValidator = (comment) => {
  if (!comment || !Object.keys(comment).length) {
    return "Comment is absent or empty";
  }

  const requiredFields = new Set<keyof CommentCreatePayload>([
    "name",
    "email",
    "body",
    "productId",
  ]);

  let wrongFieldName;

  requiredFields.forEach((fieldName) => {
    if (!comment[fieldName]) {
      wrongFieldName = fieldName;
      return;
    }
  });

  if (wrongFieldName) {
    return `Field '${wrongFieldName}' is absent`;
  }

  return null;
};

export const compareValues = (target: string, compare: string): boolean => {
  return target.toLowerCase() === compare.toLowerCase();
};

export const checkCommentUniq = (
  payload: CommentCreatePayload,
  comments: IComment[]
): boolean => {
  const byEmail = comments.find(({ email }) =>
    compareValues(payload.email, email)
  );

  if (!byEmail) {
    return true;
  }

  const { body, name, productId } = byEmail;
  return !(
    compareValues(payload.body, body) &&
    compareValues(payload.name, name) &&
    compareValues(payload.productId.toString(), productId.toString())
  );
};

//------------------

export const enhanceProductsComments = (
  products: IProduct[],
  commentRows: ICommentEntity[]
): IProduct[] => {
  const commentsByProductId = new Map<string, IComment[]>();

  for (let commentEntity of commentRows) {
    const comment = mapCommentEntity(commentEntity);
    if (!commentsByProductId.has(comment.productId)) {
      commentsByProductId.set(comment.productId, []);
    }

    const list = commentsByProductId.get(comment.productId);
    commentsByProductId.set(comment.productId, [...list, comment]);
  }

  for (let product of products) {
    if (commentsByProductId.has(product.id)) {
      product.comments = commentsByProductId.get(product.id);
    }
  }

  return products;
};

//--------------------

export const enhanceProductImages = (
  products: IProduct[],
  imageRows: IImageEntity[]
): IProduct[] => {
  const imagesByProductId = new Map<string, IProductImage[]>();
  const thumbnailsByProductId = new Map<string, IProductImage>();


  for (let imageEntity of imageRows) {
    const image = mapImages(imageEntity);
    if (!imagesByProductId.has(image.productId)) {
      imagesByProductId.set(image.productId, []);
    }

     const list = imagesByProductId.get(image.productId);
    imagesByProductId.set(image.productId, [...list, image]); 

    if (image.main) {
      thumbnailsByProductId.set(image.productId, image);
   //   console.log('setted ' +  image.url)
    }
  }

  for (let product of products) {
    
    product.thumbnail = thumbnailsByProductId.get(product.id);
  //  console.log('tn ' + product.thumbnail + product.title)
    if (imagesByProductId.has(product.id)) {
      product.images = imagesByProductId.get(product.id);

      if (!product.thumbnail) {
        product.thumbnail = product.images[0];
    //    console.log('set ' + product.title + ' tn=  ' + product.thumbnail.url )
      }
    }
  }
//  console.log('EPI')
  return products;
}

/* export const enhanceProductImages = (
  products: IProduct[],
  imageRows: IImageEntity[]
): IProduct[] => {
  const imagesByProductId = new Map<string, IProductImage[]>();

  for (let imageEntity of imageRows) {
    const currentImage = mapImages(imageEntity);
    if (!imagesByProductId.has(currentImage.productId)) {
      imagesByProductId.set(currentImage.productId, []);
    }

    const list = imagesByProductId.get(currentImage.productId);
    imagesByProductId.set(currentImage.productId, [...list, currentImage]);

    for (let currentProduct of products) {
      if (imagesByProductId.has(currentProduct.id)) {
        currentProduct.images = imagesByProductId.get(currentProduct.id);
        for (let currentProductImage of currentProduct.images) {
          if (currentProductImage.main) {
            currentProduct.thumbnail = currentProductImage;
            break;
          }
        }
        if (!currentProduct.thumbnail && currentProduct.images.length) {
          currentProduct.thumbnail = currentProduct.images[0];
        }
      }
    }
  }

  return products;
};
 */
//----------------

export const getProductsFilterQuery = (
  filter: IProductSearchFilter
): [string, string[]] => {
  const { title, description, priceFrom, priceTo } = filter;

  let query = "SELECT * FROM products WHERE ";
  const values = [];

  if (title) {
    query += "title LIKE ? ";
    values.push(`%${title}%`);
  }

  if (description) {
    if (values.length) {
      query += " OR ";
    }

    query += "description LIKE ? ";
    values.push(`%${description}%`);
  }

  if (priceFrom || priceTo) {
    if (values.length) {
      query += " OR ";
    }

    query += `(price > ? AND price < ?)`;
    values.push(priceFrom || 0);
    values.push(priceTo || 999999);
  }

  return [query, values];
};



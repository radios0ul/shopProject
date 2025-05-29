import axios from "axios";
import { IProduct, IProductFilterPayload } from "@Shared/types";
import { IProductEditData } from "../types";

import { API_HOST } from "./const";

export async function getProducts() {
  const { data } = await axios.get<IProduct[]>(`${API_HOST}/products`);
  return data || [];
}

export async function searchProducts(
  filter: IProductFilterPayload
): Promise<IProduct[]> {
  const { data } = await axios.get<IProduct[]>(`${API_HOST}/products/search`, {
    params: filter,
  });
  return data || [];
}

export async function getProduct(id: string): Promise<IProduct | null> {
  try {
    const { data } = await axios.get<IProduct>(`${API_HOST}/products/${id}`);
    return data;
  } catch (e) {
    return null;
  }
}

export async function removeProduct(id: string): Promise<void> {
  await axios.delete(`${API_HOST}/products/${id}`);
}

function compileIdsToRemove(data: string | string[]): string[] {
  if (typeof data === "string") {
    return [data];
  }
  return data;
}

function splitNewImages(str = ""): string[] {
  return str
    .split(/\r\n|,/g)
    .map((url) => url.trim())
    .filter((url) => url);
}

export async function updateProduct(
  productId: string,
  formData: IProductEditData
): Promise<void> {
  try {
    const { data: currentProduct } = await axios.get<IProduct>(
      `${API_HOST}/products/${productId}`
    );

  //  console.log(currentProduct.thumbnail)

    if (formData.commentsToRemove) {
      /**
       * formData.commentsToRemove может содержать как строку с одним значением,
       * так и массив значений, поэтому используется хелпер compileIdsToRemove,
       * который в итоге выдаст массив строк
       */
      const commentsIdsToRemove = compileIdsToRemove(formData.commentsToRemove);

      /**
       * создаем функцию, которая при вызове выдаст массив из вызовов обращений к API
       */
      const getDeleteCommentActions = () =>
        commentsIdsToRemove.map((commentId) => {
          return axios.delete(`${API_HOST}/comments/${commentId}`);
        });

      /**
       * вызываем функцию с обращениями к API, все запросы запустятся одновременно
       */
      await Promise.all(getDeleteCommentActions());

      /**
       * пояснение к Promise.all – это один из вариантов того,
       * как можно удалять комментарии по одному
       *
       * Comments API не имеет метода удаления нескольких комментариев единовременно
       *
       * если вам такой способ неудобен, вы можете реализовать дополнительный
       * метод в Comments API для удаления нескольких комментариев за один вызов
       *
       * такой метод можно реализовать по аналогии с POST /api/products/remove-images
       */
    }

    if (formData.imagesToRemove) {
      /**
       * используем хелпер compileIdsToRemove по аналогии с commentsToRemove
       */
      const imagesIdsToRemove = compileIdsToRemove(formData.imagesToRemove);
      await axios.post(`${API_HOST}/products/delete-images`, imagesIdsToRemove);
    }

    if (formData.newImages) {
      const urls = splitNewImages(formData.newImages);

      const images = urls.map((url) => ({ url, main: false }));

      if (!currentProduct.thumbnail) {
        images[0].main = true;
      }

      await axios.post(`${API_HOST}/products/add-images`, { productId, images });
    }

    //---

      if (
      formData.mainImage 
       && formData.mainImage !== currentProduct.thumbnail?.id 
    ) {
      await axios.post(`${API_HOST}/products/update-thumbnail/${productId}`, {
        newThumbnailId: formData.mainImage,
      });
    }
  
    //---

    /**
     * обновление полей title, description и price в текущем товаре;
     * price из формы приходит в виде строки, поэтому нужно превратить его в число
     */
    await axios.patch(`${API_HOST}/products/${productId}`, {
      title: formData.title,
      description: formData.description,
      price: Number(formData.price),
    });
  } catch (e) {
    console.log(e);
  }
}

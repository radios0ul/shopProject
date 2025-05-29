import express from "express";
import {
  CommentCreatePayload,
  ICommentEntity,
  IProductEntity,
  IProductSearchFilter,
  ProductCreatePayload,
  IImageEntity,
  ImageCreatePayload,
  ImageAddPayload,
  ImageRemovePayload,
} from "../../types";

import { IComment, IProduct, IProductImage } from "@Shared/types";
import { readFile, writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, Router } from "express";
import { connection } from "../../index";
import {
  mapCommentEntity,
  mapProductsEntity,
  mapCommentsEntity,
  mapImages,
  mapImagesEntity,
} from "../services/mapping";
import { OkPacket, OkPacketParams } from "mysql2";
import {
  INSERT_COMMENT_QUERY,
  COMMENT_DUPLICATE_QUERY,
  INSERT_PRODUCT_QUERY,
  INSERT_IMAGE_QUERY,
  DELETE_IMAGES_QUERY,
  REPLACE_PRODUCT_THUMBNAIL,
  UPDATE_PRODUCT_FIELDS,
} from "../services/queries";
import { productsRouter } from "./products-api";
import {
  enhanceProductsComments,
  validateComment,
  getProductsFilterQuery,
  enhanceProductImages,
} from "../services/helpers";
import { Connection } from "mysql2/typings/mysql/lib/Connection";

export const commentsRouter = Router();

const app = express();

const jsonMiddleware = express.json();
app.use(jsonMiddleware);

const throwServerError = (res: Response, e: Error) => {
  console.debug(e.message);
  res.status(500);
  res.send("Something went wrong!!!");
};

//-------------------

commentsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const [comments] = await connection.query<ICommentEntity[]>(
      "SELECT * FROM comments"
    );

    res.setHeader("Content-Type", "application/json");
    res.send(mapCommentsEntity(comments));
  } catch (e) {
    console.debug(e.message);
    res.status(500);
    res.send("Something went wrong");
  }
});

//-------------

commentsRouter.get(
  `/:id`,
  async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id;

    try {
      const [commentToShow] = await connection.query<ICommentEntity[]>(
        `select * from comments where comment_id = "${id}"`
      );

      if (!commentToShow?.[0]) {
        res.status(404);
        res.send(`comment with id ${id} not exist`);
        return;
      }

      res.setHeader("Content-Type", "application/json");
      res.send(mapCommentsEntity(commentToShow)[0]);
    } catch (e) {
      console.debug(e.message);
      res.status(500);
      res.send("Something went wrong");
    }
  }
);

//---------------

commentsRouter.post(
  "/",
  async (req: Request<{}, {}, CommentCreatePayload>, res: Response) => {
    const validationResult = validateComment(req.body);

    if (validationResult) {
      res.status(400);
      res.send(validationResult);
      return;
    }

    try {
      const { name, email, body, productId } = req.body;

      const [sameResult] = await connection.query<ICommentEntity[]>(
        COMMENT_DUPLICATE_QUERY,
        [email.toLowerCase(), name.toLowerCase(), body.toLowerCase(), productId]
      );

      if (sameResult.length) {
        res.status(422);
        res.send("Comment with the same fields already exists");
        return;
      }

      const id = uuidv4();
      await connection.query<OkPacket>(INSERT_COMMENT_QUERY, [
        id,
        email,
        name,
        body,
        productId,
      ]);

      res.status(201);
      res.send(`Comment id:${id} has been added!`);
    } catch (e) {
      console.debug(e.message);
      res.status(500);
      res.send("Server error. Comment has not been created");
    }
  }
);

//-----------------------

commentsRouter.patch(
  "/",
  async (req: Request<{}, {}, Partial<IComment>>, res: Response) => {
    try {
      let updateQuery = "UPDATE comments SET ";

      const valuesToUpdate = [];
      ["name", "body", "email"].forEach((fieldName) => {
        if (req.body.hasOwnProperty(fieldName)) {
          if (valuesToUpdate.length) {
            updateQuery += ", ";
          }

          updateQuery += `${fieldName} = ?`;
          valuesToUpdate.push(req.body[fieldName]);
        }
      });

      updateQuery += " WHERE comment_id = ?";
      valuesToUpdate.push(req.body.id);

      const [info] = await connection.query<OkPacket>(
        updateQuery,
        valuesToUpdate
      );

      if (info.affectedRows === 1) {
        res.status(200);
        res.end();
        return;
      }

      const newComment = req.body as CommentCreatePayload;
      const validationResult = validateComment(newComment);

      if (validationResult) {
        res.status(400);
        res.send(validationResult);
        return;
      }

      const id = uuidv4();
      await connection.query<OkPacket>(INSERT_COMMENT_QUERY, [
        id,
        newComment.email,
        newComment.name,
        newComment.body,
        newComment.productId,
      ]);

      res.status(201);
      res.send({ ...newComment, id });
    } catch (e) {
      console.log(e.message);
      res.status(500);
      res.send("Server error");
    }
  }
);

//--------------------------

commentsRouter.delete(
  `/:id`,
  async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id;

    try {
      const [commentToDelete] = await connection.query<ICommentEntity[]>(
        `select * from comments where comment_id = "${id}"`
      );
      if (!commentToDelete?.[0]) {
        res.status(404);
        res.send(`comment with id ${id} not exist... Nothing to delete`);
        return;
      }

      const [del] = await connection.query<ICommentEntity[]>(
        `delete from comments where comment_id = ?`,
        id
      );

      res.status(200);
      res.send("deleted ok");
      res.end();
    } catch (e) {
      console.log(e.message);
      res.status(500);
      res.send("Server error");
    }
  }
);

//--------------------

productsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const [productRows] = await connection.query<IProductEntity[]>(
      "SELECT * FROM products"
    );

    const [commentRows] = await connection.query<ICommentEntity[]>(
      "SELECT * FROM comments"
    );

    const [imageRows] = await connection.query<IImageEntity[]>(
      "SELECT * FROM images"
    );

    const products = mapProductsEntity(productRows);
    const withComments = enhanceProductsComments(products, commentRows);
    const withImages = enhanceProductImages(withComments, imageRows);

    res.send(withImages);
  } catch (e) {
    throwServerError(res, e);
  }
});

//---------------

productsRouter.get(
  "/search",
  async (req: Request<{}, {}, {}, IProductSearchFilter>, res: Response) => {
    try {
      const [query, values] = getProductsFilterQuery(req.query);
      const [rows] = await connection.query<IProductEntity[]>(query, values);

      if (!rows?.length) {
        res.status(404);
        res.send(`Products are not found`);
        return;
      }

      const [commentRows] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments"
      );

      const products = mapProductsEntity(rows);
      const result = enhanceProductsComments(products, commentRows);

      res.send(result);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

//-----------------

productsRouter.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const [rows] = await connection.query<IProductEntity[]>(
        "SELECT * FROM products WHERE product_id = ?",
        [req.params.id]
      );

      if (!rows?.[0]) {
        res.status(404);
        res.send(`Product with id ${req.params.id} is not found`);
        return;
      }

      const [comments] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments WHERE product_id = ?",
        [req.params.id]
      );

      const [images] = await connection.query<IImageEntity[]>(
        "SELECT * FROM images WHERE product_id = ?",
        [req.params.id]
      );

      const product = mapProductsEntity(rows)[0];

      if (comments.length) {
        product.comments = mapCommentsEntity(comments);
      }

      if (images.length) {
        product.images = mapImagesEntity(images);

        for (let img of product.images) {

          //-----!!!!!!!!!!!!!!!!!!

          if (img.main) {product.thumbnail = img}
        }
        
      }

      res.send(product);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

//-----------------

productsRouter.post(
  "/",
  async (req: Request<{}, {}, ProductCreatePayload>, res: Response) => {
    try {
      const { title, description, price, images } = req.body;
      const id = uuidv4();
      await connection.query<OkPacket>(INSERT_PRODUCT_QUERY, [
        id,
        title || null,
        description || null,
        price || null,
      ]);

      if (images) {
        const values = images.map((image) => [
          uuidv4(),
          image.url,
          id,
          image.main,
        ]);
        await connection.query<OkPacket>(INSERT_IMAGE_QUERY, [values]);
      }

      res.status(201);
      res.send(`Product id:${id} has been added!`);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

//-------------

productsRouter.post(
  "/add-images",
  async (req: Request<{}, {}, ImageAddPayload>, res: Response) => {
    try {
      const { productId, images } = req.body;

      if (!images?.length) {
        res.status(400);
        res.send("no images to add");
        return;
      }

      const values = images.map((image) => [
        uuidv4(),
        image.url,
        productId,
        image.main,
      ]);
      await connection.query<OkPacket>(INSERT_IMAGE_QUERY, [values]);

      res.status(201);
      res.send(`images for product with id ${productId} added`);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

//---------

productsRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const [info] = await connection.query<OkPacket>(
        "SELECT * FROM products WHERE product_id = ?",
        [req.params.id]
      );

      if (info.affectedRows === 0) {
        res.status(404);
        res.send(`Product with id ${req.params.id} is not found`);
        return;
      }

      await connection.query<OkPacket>(
        "DELETE FROM images WHERE product_id = ?",
        [req.params.id]
      );

      await connection.query<OkPacket>(
        "DELETE FROM comments WHERE  product_id = ?",
        [req.params.id]
      );

      await connection.query<OkPacket>(
        "DELETE FROM products WHERE product_id = ?",
        [req.params.id]
      );

      res.status(200);
      res.end();
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

//--------------

productsRouter.post(
  "/delete-images",
  async (req: Request<{}, {}, ImageRemovePayload>, res: Response) => {
    try {
      const imagesToRemove = req.body;

      if (!imagesToRemove?.length) {
        res.status(400);
        res.send("No images to delete");
        return;
      }

      const [info] = await connection.query<OkPacket>(DELETE_IMAGES_QUERY, [
        [imagesToRemove],
      ]);

      if (info.affectedRows === 0) {
        res.status(404);
        res.send("No one image removed");
        return;
      }

      res.status(200);
      res.send("Images has been removed!");
    //  console.log("removed");
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

//-----------

productsRouter.post(
  "/update-thumbnail/:id",
  async (
    req: Request<{ id: string }, {}, { newThumbnailId: string }>,
    res: Response
  ) => {
    const [currentThumbnailRows] = await connection.query<IImageEntity[]>(
      "SELECT * FROM images WHERE product_id=? AND main=?",
      [req.params.id, 1]
    );
    if (!currentThumbnailRows?.length) {
      res.status(400);
      res.send("No thumbnails found");

      return;
    }

    if (currentThumbnailRows.length > 1) {
      res.status(400);
      res.send("Too many thumbnails found");
    }

    const [newThumbnailRows] = await connection.query<IImageEntity[]>(
      "SELECT * FROM images WHERE product_id=? AND image_id=?",
      [req.params.id, req.body.newThumbnailId]
    );

    if (newThumbnailRows?.length !== 1) {
      res.status(400);
      res.send("Incorrect new thumbnail id");
      return;
    }

    const currentThumbnailId = currentThumbnailRows[0].image_id;
    const [info] = await connection.query<OkPacket>(REPLACE_PRODUCT_THUMBNAIL, [
      currentThumbnailId,
      req.body.newThumbnailId,
      currentThumbnailId,
      req.body.newThumbnailId,
    ]);

    if (info.affectedRows === 0) {
      res.status(404);
      res.send("No one image has been updated");
      return;
    }

    res.status(200);
    res.send("New product thumbnail has been set!");

    try {
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

//--------------------

productsRouter.patch(
  "/:id",
  async (
    req: Request<{ id: string }, {}, ProductCreatePayload>,
    res: Response
  ) => {
    try {
      const { id } = req.params;

      const [rows] = await connection.query<IProductEntity[]>(
        "SELECT * FROM products WHERE product_id = ?",
        [id]
      );

      if (!rows?.[0]) {
        res.status(404);
        res.send(`Product with id ${id} is not found`);
        return;
      }

      const currentProduct = rows[0];

      /**
       * по-простому обновляем поля: либо берем их новые значения,
       * либо их текущие значения
       */
      await connection.query<OkPacket>(UPDATE_PRODUCT_FIELDS, [
        req.body.hasOwnProperty("title")
          ? req.body.title
          : currentProduct.title,
        req.body.hasOwnProperty("description")
          ? req.body.description
          : currentProduct.description,
        req.body.hasOwnProperty("price")
          ? req.body.price
          : currentProduct.price,
        id,
      ]);

      res.status(200);
      res.send(`Product id:${id} has been added!`);
    } catch (e) {
      throwServerError(res, e);
     // console.log('patch error')
    }
  }
);

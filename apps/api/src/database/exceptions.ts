interface ModelNotFoundOptions {
  statusCode?: number;
}

export class UniqueModelError extends Error {}

export class ModelNotFoundError {
  message?: string;
  statusCode = 404;

  constructor(message?: string, options?: ModelNotFoundOptions) {
    this.message = message;
    this.statusCode = options?.statusCode ?? 404;
  }
}

export const orFail =
  (modelName: string) =>
  <T = any>(model: T) => {
    if (!model) {
      throw new ModelNotFoundError(`${modelName} not found`);
    }

    return model;
  };

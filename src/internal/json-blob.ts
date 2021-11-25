import { JsonValue, Type } from "paratype";
import { BlobReadResult } from "../BlobStore";

export const getJsonData = async <T>(readResult: BlobReadResult, dataType: Type<T>): Promise<T> => {
    const text = await readResult.blob.text();
    const json = JSON.parse(text) as JsonValue;
    return dataType.fromJsonValue(json);
};

export const getJsonBlob = <T>(data: T, dataType: Type<T>): Blob => {
    const json = dataType.toJsonValue(data);
    const text = JSON.stringify(json);
    return new Blob([text], { type: "application/json" });
};

import { JsonValue, Type } from "paratype";
import { BlobReadResult } from "../BlobStore";

export const readBlobText = (blob: Blob): Promise<string> => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
});

export const getJsonData = async <T>(readResult: BlobReadResult, dataType: Type<T>): Promise<T> => {
    const text = await readBlobText(readResult.blob);
    const json = JSON.parse(text) as JsonValue;
    return dataType.fromJsonValue(json);
};

export const getJsonBlob = <T>(data: T, dataType: Type<T>): Blob => {
    const json = dataType.toJsonValue(data);
    const text = JSON.stringify(json);
    return new Blob([text], { type: "application/json" });
};

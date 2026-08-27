import "server-only";
import { readFile } from "node:fs/promises";
import mammoth from "mammoth";
import { fileTypeFromFile } from "file-type";
import { AppError } from "@/lib/errors";
import { extensionOf, MAX_FILE_SIZE } from "@/lib/files";

const MIME_BY_EXT:Record<string,string>={".pdf":"application/pdf",".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",".txt":"text/plain",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp"};

export async function validateAndPrepareRecord(path:string,displayName:string,declaredMime:string,declaredSize:number){
  if(declaredSize<=0)throw new AppError("INVALID_RECORD",`${displayName}: the file is empty.`,422);
  if(declaredSize>MAX_FILE_SIZE)throw new AppError("INVALID_RECORD",`${displayName}: the file is larger than 15 MiB.`,422);
  const ext=extensionOf(displayName);const expected=MIME_BY_EXT[ext];const genericMime=!declaredMime||declaredMime==="application/octet-stream";if(!expected||(!genericMime&&expected!==declaredMime))throw new AppError("INVALID_RECORD",`${displayName}: unsupported or mismatched file type.`,422);
  const detected=await fileTypeFromFile(path);
  if(ext!==".txt"&&(!detected||detected.mime!==expected))throw new AppError("INVALID_RECORD",`${displayName}: file contents do not match its type or are corrupt.`,422);
  if(ext===".pdf"){
    const pdf=await readFile(path);const marker=pdf.toString("latin1");
    if(!marker.startsWith("%PDF-")||!marker.includes("%%EOF"))throw new AppError("INVALID_RECORD",`${displayName}: the PDF appears corrupt.`,422);
    if(/\/Encrypt\b/.test(marker))throw new AppError("INVALID_RECORD",`${displayName}: encrypted PDFs are not supported. Export an unlocked copy.`,422);
  }
  if(ext===".docx"){
    try{const result=await mammoth.extractRawText({path});const normalized=normalizeText(result.value);if(!normalized)throw new Error("empty");return{text:normalized.text,truncated:normalized.truncated};}
    catch{throw new AppError("INVALID_RECORD",`${displayName}: no extractable DOCX text was found. Export scanned content as PDF or image.`,422);}
  }
  if(ext===".txt"){
    const buffer=await readFile(path);if(buffer.includes(0))throw new AppError("INVALID_RECORD",`${displayName}: the text file is not valid UTF-8 text.`,422);
    const decoded=new TextDecoder("utf-8",{fatal:true}).decode(buffer);const normalized=normalizeText(decoded);if(!normalized.text)throw new AppError("INVALID_RECORD",`${displayName}: the text file is empty.`,422);return{text:normalized.text,truncated:normalized.truncated};
  }
  return{filePath:path,mimeType:expected};
}

function normalizeText(value:string){const text=value.replace(/\r\n?/g,"\n").replace(/[\t ]+/g," ").replace(/\n{3,}/g,"\n\n").trim();return{text:text.slice(0,150_000),truncated:text.length>150_000}}

declare module "word-extractor" {
  class WordExtractor {
    extract(buffer: Buffer): Promise<{ getBody(): string }>;
  }
  export default WordExtractor;
}

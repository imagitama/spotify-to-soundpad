import request from "request";

require("dotenv").config();

const youtubeApiKey = process.env.YOUTUBE_API_KEY;
const youtubeApiBaseUrl = "https://www.googleapis.com/youtube/v3";

if (!youtubeApiKey) {
  throw new Error("No youtube api key");
}

export const getBestYouTubeVideoId = async (
  searchTerm: string
): Promise<string> => {
  console.debug(`Querying youtube...`, { searchTerm });

  const cleanSearchTerm = encodeURIComponent(searchTerm);
  const url = `${youtubeApiBaseUrl}/search?part=snippet&maxResults=1&order=relevance&q=${cleanSearchTerm}&type=video&videoDefinition=high&key=${youtubeApiKey}`;

  return new Promise((resolve, reject) => {
    var options = {
      url,
      json: true,
    };

    request.get(options, function (error, response, body) {
      if (error) {
        reject(error);
        return;
      }

      if (body.error) {
        reject(new Error(`${body.error.code}: ${body.error.message}`));
        return;
      }

      if (!body.items.length) {
        reject(new Error("No youtube videos found!"));
        return;
      }

      const bestResultId = body.items[0].id.videoId;

      console.debug(`Found best result: ${bestResultId}`);

      resolve(bestResultId);
    });
  });
};

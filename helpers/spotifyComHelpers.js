const gatherData = async (token, accumulator, url) => {
  console.log("Getting", url);
  await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })
  .then(response => response.json())
  .then(async result => {
    accumulator.push(result.items);
    if (result.next) {
      await gatherData(token, accumulator, result.next)
    }
  })
  .catch(err => { throw err; })
  return accumulator;
}

// function to get an item by an id
// params: token, url (with the id already in it)
export async function getSpotifyData(token, url) {
  let data = null;
  let baseUrl = "https://api.spotify.com/v1";
  await fetch(baseUrl + url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })
  .then(response => response.json())
  .then(jsonData => {
    data = jsonData;
  })
  return data;
}

// function to get a list of items by id
// params: token, url, listOfIds
export function getSpotifyDataFromIdList(token, itemType, listOfIds) {
  const data = [];
  let url = '';
  switch (itemType) {
    case "playlist":
      url = 'https://api.spotify.com/v1/playlist'
      break;
    default:
      break;
  }
  listOfIds.map(async (id) => await getSpotifyDataById(token, url+`/${id}`))
}

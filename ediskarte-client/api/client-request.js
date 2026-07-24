import axios from "axios";
import decodeToken from "@/api/token-decoder";
import * as mime from "react-native-mime-types";

export async function AddJobRequest(params) {
  const formData = new FormData();

  function parseMultipleImages(images) {
    images.forEach((img) =>
      formData.append("jobImage", {
        uri: img,
        name: img.split("/").pop(),
        type: mime.lookup(img),
      })
    );
  }

  if (params.client) {
    formData.append("client", params.client.id);
  }

  if (params.jobImage.length != 0) {
    parseMultipleImages(params.jobImage);
  }

  Object.keys(params).forEach((key) => {
    if (key !== "jobImage" && key !== "client") {
      formData.append(key, params[key]);
    }
  });
  try {
    const jobPost = await axios.post(
      `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/client-home/add-jobs`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    console.log("Successful Job Post", jobPost.data);
  } catch (e) {
    console.log(e);
  }
}

export async function fetchJobListings() {
  const { data } = await decodeToken();
  const getClientListings = await axios.get(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/client-home/job-listings`,
    { params: { client: data.id } }
  );
  return getClientListings.data;
}

export async function fetchSingleJobListing(id) {
  const getSingleListing = await axios.get(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/client-home/job-listings/${id}`,
    { params: { jobID: id } }
  );

  return getSingleListing.data;
}

export async function deleteJobListing(id) {
  const deleteListing = await axios.delete(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/client-home/delete-listing`,
    { params: { jobID: id } }
  );

  return deleteListing.data;
}

export async function editJobListing(params) {
  const formData = new FormData();

  const parsedImages = params.jobImage.map((img) =>
    img.replace(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/`, "").trim()
  );

  if (params.jobImage.length != 0) {
    parsedImages.map((img) => {
      if (img.includes("file:///")) {
        formData.append("jobImage", {
          uri: img,
          name: img.split("/").pop(),
          type: mime.lookup(img),
        });
      } else {
        formData.append("jobImage", img);
      }
    });
  }

  Object.keys(params).forEach((key) => {
    if (key !== "jobImage") {
      formData.append(key, params[key]);
    }
  });

  const editListing = await axios.patch(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/client-home/${params.id}/edit-listing`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  console.log("Successfully sent data to be edited", editListing.data);
}

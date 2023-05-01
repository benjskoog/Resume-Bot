import React from "react";
import { Link } from "react-router-dom";

const TopBar = ({ path }) => {
  const pathToTitleCase = (path) => {
    const mainPath = path.split("/").slice(0, 2).join("/"); // Take only the first two segments

    return mainPath
      .substring(1) // Remove the leading slash
      .split("-") // Split the string into words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
      .join(" "); // Join the words with spaces
  };

  const title = pathToTitleCase(path);

  return (
    <div class="bg-gray-900 p-6 items-center">
      <div class="text-center">
        <p class="text-xl leading-6 text-white">{title}</p>
      </div>
    </div>
  );
};

export default TopBar;

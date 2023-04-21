import React, { useState } from "react";
import { Link } from "react-router-dom";

const TopBar = ({ path }) => {

  return (
    <div class="bg-gray-900 p-6 items-center">
    <div class="text-center">
      <p class="text-xl leading-6 text-white">{path}</p>
    </div>
  </div>
  );
};

export default TopBar;

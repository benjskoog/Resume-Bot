import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Link } from 'react-router-dom';

const NavBarItem = ({ itemName, itemLink }) => {

  return (
        <Link to={itemLink} className="p-3 max-w-sm mx-1 bg-white rounded-xl text-center m-2 mx-1">
            {itemName}
          </Link>
  );
};

export default NavBarItem;
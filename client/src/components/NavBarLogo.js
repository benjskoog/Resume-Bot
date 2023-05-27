import React from 'react';

const NavBarLogo = ({ name }) => {

  return (
<div className="xl:flex justify-start p-6 items-center space-x-3">
    <div className="h-[44px] w-[44px]">
                  <img src="/ResumeBot.png" alt="Logo"/>
                </div>
    <p className="text-2xl leading-6 text-white">{name}</p>
  </div>
  );
};

export default NavBarLogo;
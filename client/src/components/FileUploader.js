import React, { useState, useRef, useContext } from "react";
import axios from "axios";
import UserContext from './UserContext';

const FileUploader = ({ setIsModalOpen, closeModal }) => {
  const [files, setFiles] = useState({});
  const [galleryItems, setGalleryItems] = useState([]);
  const [draggedOver, setDraggedOver] = useState(false);
  const { user, setUser } = useContext(UserContext);
  const hiddenInputRef = useRef();
  const [loading, setLoading] = useState(false); // Add loading state
  

  const formatSize = (size) => {
    return size > 1024
      ? size > 1048576
        ? Math.round(size / 1048576) + "mb"
        : Math.round(size / 1024) + "kb"
      : size + "b";
  };

  const addFile = (file) => {
    const isImage = file.type.match("image.*");
    const objectURL = URL.createObjectURL(file);

    const fileData = {
      id: objectURL,
      name: file.name,
      size: formatSize(file.size),
      type: isImage ? "image" : "file",
      src: isImage ? objectURL : null,
      alt: isImage ? file.name : null,
    };

    setGalleryItems((prevItems) => [fileData, ...prevItems]);
    console.log(file)
    setFiles((prevFiles) => ({ ...prevFiles, [objectURL]: file }));
    console.log(files)
  };

  const handleSelectFilesClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.click();
    }
  };  

  const handleFilesChange = (e) => {
    for (const file of e.target.files) {
      addFile(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setDraggedOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDraggedOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    for (const file of e.dataTransfer.files) {
      addFile(file);
    }
    setDraggedOver(false);
  };

  const handleDeleteFile = (id) => {
    setGalleryItems((prevItems) => prevItems.filter((item) => item.id !== id));
    setFiles((prevFiles) => {
      const updatedFiles = { ...prevFiles };
      delete updatedFiles[id];
      return updatedFiles;
    });
  };

  const handleFileUpload = async () => {
    if (Object.keys(files).length === 0) {
      alert("Please select a file first.");
      return;
    }

    setLoading(true); // Start loading before upload
  
    const formData = new FormData();
  
    Object.values(files).forEach((file) => {
      formData.append("file", file);
    });

    formData.append("id", user.id);
  
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";
      const response = await axios.post(`${backendUrl}/upload-resume`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.success) {
        alert("Resume uploaded successfully.");
        setIsModalOpen(false)
      } else {
        alert("Error uploading resume.");
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
    }

    setLoading(false); // End loading after upload
  };
  

  const handleCancel = (e) => {
    setGalleryItems([]);
    setFiles({});
    closeModal(e);
  };

  const GalleryItem = ({ fileData, onDelete }) => {
    const isImage = fileData.type === "image";
    return (
      <li className="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
        <article
          tabIndex="0"
          className={`group w-full h-full rounded-md focus:outline-none focus:shadow-outline ${
            isImage ? "bg-gray-100" : ""
          } cursor-pointer relative shadow-sm`}
        >
          {isImage && (
            <img
              alt={fileData.alt}
              src={fileData.src}
              className="w-full h-full sticky object-cover rounded-md bg-fixed"
            />
          )}
          <section className="flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0 py-2 px-3">
            <h1 className="flex-1">{fileData.name}</h1>
            <div className="flex">
              <span className="p-1 text-blue-800"></span>
              <p className="p-1 size text-xs text-gray-700">{fileData.size}</p>
              <button
                className="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md text-gray-800"
                onClick={() => onDelete(fileData.id)}
              >
                <svg
                  className="pointer-events-none fill-current w-4 h-4 ml-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    className="pointer-events-none"
                    d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"
                  />
                </svg>
              </button>
            </div>
          </section>
        </article>
      </li>
    );
  };
  

  return (
    <div className="relative">
    {loading && (
      <div className="absolute inset-0 z-10 flex justify-center items-center bg-white bg-opacity-50">
        <div className="w-12 h-12 mt-4 mb-4 rounded-full animate-spin border-y-2 border-solid border-gray-900 border-t-transparent"></div>
      </div>
    )}
    <div className="bg-gray-100 h-full w-full">
        
      <main className="container mx-auto max-w-screen-lg h-full">

        <article aria-label="File Upload Modal" className="relative h-full flex flex-col bg-white shadow-xl rounded-md" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDragEnter={handleDragEnter}>
          <section className="h-full overflow-auto p-8 w-full h-full flex flex-col">
            <header className="border-dashed border-2 border-gray-400 py-12 flex flex-col justify-center items-center">
              <p className="mb-3 font-semibold text-gray-900 flex flex-wrap justify-center">
                <span>Drag and drop your</span>&nbsp;<span>files anywhere or</span>
              </p>
              <input id="hidden-input" type="file" multiple className="hidden" ref={hiddenInputRef} onChange={handleFilesChange}/>
              <button id="button" onClick={handleSelectFilesClick} className="mt-2 rounded-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 focus:shadow-outline focus:outline-none">
                Upload your resume
              </button>
            </header>

            <h1 className="pt-8 pb-3 font-semibold sm:text-lg text-gray-900">
              To Upload
            </h1>

            <ul id="gallery" className="flex flex-1 flex-wrap -m-1">
              {galleryItems.length === 0 ? (
                <li
                  id="empty"
                  className="h-full w-full text-center flex flex-col items-center justify-center items-center"
                >
                  <img
                    className="mx-auto w-32"
                    src="https://user-images.githubusercontent.com/507615/54591670-ac0a0180-4a65-11e9-846c-e55ffce0fe7b.png"
                    alt="no data"
                  />
                  <span className="text-small text-gray-500">No files selected</span>
                </li>
              ) : (
                galleryItems.map((item) => (
                  <GalleryItem
                    key={item.id}
                    fileData={item}
                    onDelete={handleDeleteFile}
                  />
                ))
              )}
            </ul>
          </section>
          <footer className="flex justify-end px-8 pb-8 pt-4">
            <button id="submit" onClick={handleFileUpload} className="rounded-sm px-3 py-1 bg-blue-700 hover:bg-blue-500 text-white focus:shadow-outline focus:outline-none">
              Upload now
            </button>
            <button id="cancel" onClick={handleCancel} className="ml-3 rounded-sm px-3 py-1 hover:bg-gray-300 focus:shadow-outline focus:outline-none">
              Cancel
            </button>
          </footer>
        </article>
      </main>
    </div>
    <template id="file-template">
      <li className="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
        <article tabindex="0" className="group w-full h-full rounded-md focus:outline-none focus:shadow-outline elative bg-gray-100 cursor-pointer relative shadow-sm">
          <img alt="upload preview" className="img-preview hidden w-full h-full sticky object-cover rounded-md bg-fixed" />

          <section className="flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0 py-2 px-3">
            <h1 className="flex-1 group-hover:text-blue-800"></h1>
            <div className="flex">
              <span className="p-1 text-blue-800">
                <i>
                  <svg className="fill-current w-4 h-4 ml-auto pt-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path d="M15 2v5h5v15h-16v-20h11zm1-2h-14v24h20v-18l-6-6z" />
                  </svg>
                </i>
              </span>
              <p className="p-1 size text-xs text-gray-700"></p>
              <button className="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md text-gray-800">
                <svg className="pointer-events-none fill-current w-4 h-4 ml-auto" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path className="pointer-events-none" d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z" />
                </svg>
              </button>
            </div>
          </section>
        </article>
      </li>
    </template>

    <template id="image-template">
      <li className="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
        <article tabindex="0" className="group hasImage w-full h-full rounded-md focus:outline-none focus:shadow-outline bg-gray-100 cursor-pointer relative text-transparent hover:text-white shadow-sm">
          <img alt="upload preview" className="img-preview w-full h-full sticky object-cover rounded-md bg-fixed" />

          <section className="flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0 py-2 px-3">
            <h1 className="flex-1"></h1>
            <div className="flex">
              <span className="p-1">
                <i>
                  <svg className="fill-current w-4 h-4 ml-auto pt-" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path d="M5 8.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5c0 .829-.672 1.5-1.5 1.5s-1.5-.671-1.5-1.5zm9 .5l-2.519 4-2.481-1.96-4 5.96h14l-5-8zm8-4v14h-20v-14h20zm2-2h-24v18h24v-18z" />
                  </svg>
                </i>
              </span>

              <p className="p-1 size text-xs"></p>
              <button className="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md">
                <svg className="pointer-events-none fill-current w-4 h-4 ml-auto" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path className="pointer-events-none" d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z" />
                </svg>
              </button>
            </div>
          </section>
        </article>
      </li>
    </template>
    </div>
  );
}

export default FileUploader;


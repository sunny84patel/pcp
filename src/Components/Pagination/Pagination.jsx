import React from "react";

const Pagination = ({ currentPage, onPageChange, hasNextPage }) => {
  // Only hide pagination if we're on page 1 AND there are no more pages
  // This means there's only 1 page total, so no pagination needed
  // Always show pagination if currentPage > 1 (user needs to navigate back)
  if (currentPage === 1 && !hasNextPage) {
    return null;
  }

  const generatePageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 7;
    
    // Calculate how many pages we should show
    // If hasNextPage is true, we know there's at least currentPage + 1 pages
    // If hasNextPage is false, currentPage is the last page
    const totalKnownPages = hasNextPage ? currentPage + 1 : currentPage;
    
    // Determine the range of pages to show
    const halfRange = Math.floor(maxPagesToShow / 2);
    let startPage = Math.max(1, currentPage - halfRange);
    let endPage = Math.min(totalKnownPages, startPage + maxPagesToShow - 1);
    
    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Generate page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className="flex justify-center items-center gap-2 py-6 mt-4 border-t">
      {/* First Button */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="border px-4 py-1 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        style={{ border: "2px solid #5F43B2" }}
      >
        « First
      </button>

      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="border px-4 py-1 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        style={{ border: "2px solid #5F43B2" }}
      >
        ← Previous
      </button>

      {/* Page Numbers */}
      {pageNumbers.map((number) => (
        <button
          key={number}
          onClick={() => onPageChange(number)}
          className={`px-3 py-1 rounded-full text-sm border cursor-pointer transition-colors ${
            currentPage === number
              ? "bg-[#5F43B2] text-white hover:bg-[#4a3491]"
              : "bg-white text-black hover:bg-gray-50"
          }`}
          style={{ border: "1px solid #5F43B2" }}
        >
          {number}
        </button>
      ))}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="border px-4 py-1 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        style={{ border: "2px solid #5F43B2" }}
      >
        Next →
      </button>

      {/* Last Button - only show if we know there are more pages */}
      {hasNextPage && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          className="border px-4 py-1 rounded-full text-sm hover:bg-gray-50 transition-colors"
          style={{ border: "2px solid #5F43B2" }}
        >
          Last »
        </button>
      )}
    </div>
  );
};

export default Pagination;
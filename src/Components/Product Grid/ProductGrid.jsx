import React from 'react';
import ProductCard from '../Product Card/ProductCard';

const ProductGrid = ({ products }) => {
  return (
    <div className="grid grid-cols-3 gap-6">
      {products.map((product, index) => (
        <ProductCard key={index} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;

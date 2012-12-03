using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace GridInLineEditing.Models
{
    public class NorthwindRepository
    {
        private NorthwindEntities context = new NorthwindEntities();

        public IQueryable<ProductViewModel> Products
        {
            get
            {
                return context.Products.Select(p =>
                    new ProductViewModel()
                    {
                        ProductID = p.ProductID,
                        ProductName = p.ProductName,
                        CategoryID = p.CategoryID,
                        UnitPrice = p.UnitPrice
                    });
            }
        }

        public IQueryable<Category> Categories
        {
            get
            {
                return context.Categories;
            }
        }

        public int AddProduct(ProductViewModel viewModel)
        {
            Product product = new Product();
            viewModel.CopyToProduct(product);
            context.Products.AddObject(product);
            context.SaveChanges();
            return product.ProductID;
        }

        public void UpdateProduct(ProductViewModel viewModel)
        {
            Product product = GetProductByID(viewModel.ProductID);
            viewModel.CopyToProduct(product);
            context.SaveChanges();
        }

        public void DeleteProduct(int productID)
        {
            Product product = GetProductByID(productID);
            context.Products.DeleteObject(product);
            context.SaveChanges();
        }

        private Product GetProductByID(int productID)
        {
            Product product = context.Products.FirstOrDefault(p => p.ProductID == productID);
            if (product == null)
            {
                throw new ArgumentException("Invalid Product ID : " + productID);
            }
            return product;
        }
    }
}
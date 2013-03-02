using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Kendo.Mvc.UI;
using Kendo.Mvc.Extensions;
using BindingToNullableField.Models;

namespace BindingToNullableField.Controllers
{
    
    public class HomeController : Controller
    {
        static List<Product> products = new List<Product>();
        static List<Category> categories = new List<Category>();

        static HomeController()
        {
            categories.Add(new Category
                {
                     CategoryID= 1,
                     CategoryName= "Beverages"
                });

            categories.Add(new Category
            {
                CategoryID= 2,
                CategoryName= "Condiments"
            });
            products.Add(new Product
                {
                    ProductID = 1,
                    ProductName = "Chai",
                    CategoryID = 1
                });
            products.Add(new Product
                {
                    ProductID = 3,
                    ProductName = "Aniseed Syrup",
                    CategoryID = 2
                });
            products.Add(new Product
                {
                    ProductID = 7,
                    ProductName = "Uncle Bob's Organic Dried Pears",
                    CategoryID = null
                });
        }

        public ActionResult Index()
        {
            ViewData["categories"] = categories;
            return View();
        }

        public ActionResult Read([DataSourceRequest] DataSourceRequest request)
        {
            return Json(products.ToDataSourceResult(request));
        }

        public ActionResult Update(int productID)
        {
            var product = products.First(p => p.ProductID == productID);
            TryUpdateModel(product);
            return Json(ModelState.ToDataSourceResult());
        }

        public ActionResult About()
        {
            return View();
        }
    }
}

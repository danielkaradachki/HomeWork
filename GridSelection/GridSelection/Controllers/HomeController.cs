using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using GridSelection.Models;
using Kendo.Mvc.Extensions;
using Kendo.Mvc.UI;
namespace GridSelection.Controllers
{
    public class HomeController : Controller
    {
        private NorthwindContainer context = new NorthwindContainer();

        public ActionResult ServerSelection(int? categoryID)
        {
            var viewModel = new ServerSelectionViewModel();
            viewModel.Categories = context.Categories;
            if (categoryID.HasValue)
            {
                viewModel.Products = ProductsByCategory(categoryID.Value);
            }

            return View(viewModel);
        }

        public ActionResult AjaxLink()
        {
            return View(context.Categories);
        }

        public ActionResult ClientSelection()
        {
            return View();
        }
        
        public ActionResult ReadCategories([DataSourceRequest] DataSourceRequest request)
        {
            return Json(context.Categories.ToDataSourceResult(request, c => new
                {
                    CategoryID = c.CategoryID,
                    CategoryName = c.CategoryName
                }));
        }

        public ActionResult ReadProducts([DataSourceRequest] DataSourceRequest request)
        {
            return Json(context.Products.ToDataSourceResult(request, p => new
            {
                ProductID = p.ProductID,
                ProductName = p.ProductName
            }));
        }

        public ActionResult ProductsPartial(int categoryID)
        {
            return PartialView(ProductsByCategory(categoryID));
        }

        private IEnumerable<Product> ProductsByCategory(int categoryID)
        {
            return context.Products.Where(p => p.CategoryID == categoryID);
        }
    }    
}

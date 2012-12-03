using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Kendo.Mvc.Extensions;
using Kendo.Mvc.UI;
using GridInLineEditing.Models;
namespace GridInLineEditing.Controllers
{
    public class HomeController : Controller
    {
        private NorthwindRepository repository = new NorthwindRepository();

        public ActionResult Index()
        {
            ViewBag.Message = "Welcome to ASP.NET MVC!";
            ViewData["categories"] = new SelectList(repository.Categories, "CategoryID", "CategoryName");
            return View();
        }

        public ActionResult Read([DataSourceRequest] DataSourceRequest request)
        {
            return Json(repository.Products.ToDataSourceResult(request));
        }

        public ActionResult Update(ProductViewModel product)
        {
            if (ModelState.IsValid)
            {
                repository.UpdateProduct(product);
            }
            return Json(ModelState.ToDataSourceResult());
        }

        public ActionResult Create([DataSourceRequest] DataSourceRequest request, ProductViewModel product)
        {
            if (ModelState.IsValid)
            {
                product.ProductID = repository.AddProduct(product);
            }
            return Json(new[] { product }.ToDataSourceResult(request));
        }

        public ActionResult Destroy(int productID)
        {
            repository.DeleteProduct(productID);
            return Json(ModelState.ToDataSourceResult());
        }

        public ActionResult About()
        {
            return View();
        }
    }
}

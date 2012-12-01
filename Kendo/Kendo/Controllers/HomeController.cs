using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Kendo.Models;
using System.Collections;
using Kendo.Mvc.UI;
using Kendo.Mvc.Extensions;
namespace Kendo.Controllers
{
    public class HomeController : Controller
    {
        NorthwindEntities context = new NorthwindEntities();

        public ActionResult Index()
        {
            ViewBag.Message = "Welcome to ASP.NET MVC!";

            return View();
        }

        public ActionResult Grid()
        {
            ViewData["categories"] = GetCategories();
            return View();
        }

        public ActionResult Read([DataSourceRequest] DataSourceRequest request)
        {
            return Json(GetProducts().ToDataSourceResult(request));
        }

        public ActionResult Update(Product product)
        {

            return Json(ModelState.ToDataSourceResult());
        }

        public ActionResult Create(Product product)
        {            
            return Json(ModelState.ToDataSourceResult());
        }

        public ActionResult Products()
        {
            return Json(GetProducts(), JsonRequestBehavior.AllowGet);
        }

        public ActionResult Categories()
        {
            return Json(GetCategories(), JsonRequestBehavior.AllowGet);
        }


        private IEnumerable GetCategories()
        {
            return context.Categories.Select(p => new
            {
                p.CategoryID,
                p.CategoryName
            });
        }

        private IEnumerable GetProducts()
        {
            return context.Products.Select(p => new
                {
                    p.ProductID,
                    p.ProductName,
                    p.UnitPrice,
                    p.UnitsInStock,
                    p.CategoryID,
                    Category = new {
                        p.CategoryID,
                        p.Category.CategoryName
                    }
                });
        }

        public ActionResult About()
        {
            return View();
        }
    }
}
